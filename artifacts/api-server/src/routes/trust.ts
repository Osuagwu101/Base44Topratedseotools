import { Router, type IRouter, type RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import {
  db,
  ordersTable,
  productsTable,
  siteTrustSettingsTable,
  testimonialsTable,
  productReviewsTable,
  reviewPromptsTable,
  paymentMethodsTable,
  accessScreenshotsTable,
} from "@workspace/db";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const requireAdmin: RequestHandler = (req, res, next) => {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    res.status(503).json({ error: "Admin credentials not configured (ADMIN_USERNAME / ADMIN_PASSWORD)." });
    return;
  }

  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Basic ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const colonIdx = decoded.indexOf(":");
  const u = colonIdx >= 0 ? decoded.slice(0, colonIdx) : decoded;
  const p = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : "";

  if (u !== adminUsername || p !== adminPassword) {
    res.status(401).json({ error: "Wrong username or password." });
    return;
  }

  next();
};

// ── HELPERS & SEEDERS ────────────────────────────────────────────────────────

async function seedDefaultPaymentMethodsIfNeeded() {
  const countRes = await db.select({ count: sql<number>`count(*)::int` }).from(paymentMethodsTable);
  if (countRes[0]?.count === 0) {
    const defaults = [
      { name: "Visa", sortOrder: 0, isEnabled: true },
      { name: "Mastercard", sortOrder: 1, isEnabled: true },
      { name: "Verve", sortOrder: 2, isEnabled: true },
      { name: "Bank Transfer", sortOrder: 3, isEnabled: true },
    ];
    await db.insert(paymentMethodsTable).values(defaults);
    logger.info("Seeded default payment methods");
  }
}

async function seedDefaultTrustSettingsIfNeeded() {
  const defaults = [
    { key: "customersBaseline", value: "100" },
    { key: "customersCountMode", value: "unique" },
    { key: "whatsappMessage", value: "Hello, I need assistance with a product or subscription on Top Rated SEO Tools." },
    { key: "emailEnabled", value: "false" },
    { key: "whatsappEnabled", value: "false" },
    { key: "emailOpenApp", value: "true" },
  ];

  for (const item of defaults) {
    const existing = await db
      .select()
      .from(siteTrustSettingsTable)
      .where(eq(siteTrustSettingsTable.key, item.key));
    if (existing.length === 0) {
      await db.insert(siteTrustSettingsTable).values(item);
    }
  }
}

// Helper to load settings as a map
async function getTrustSettingsMap() {
  await seedDefaultTrustSettingsIfNeeded();
  const settings = await db.select().from(siteTrustSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) {
    if (s.value !== null && s.value !== undefined) {
      map[s.key] = s.value;
    }
  }
  return map;
}

// ── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────────

// GET /api/trust/settings
router.get("/trust/settings", async (req, res) => {
  try {
    const settings = await getTrustSettingsMap();
    const result: Record<string, string> = {};

    const emailEnabled = settings["emailEnabled"] === "true";
    if (emailEnabled) {
      result["businessEmail"] = settings["businessEmail"] || "";
    }
    result["emailEnabled"] = emailEnabled ? "true" : "false";
    result["emailOpenApp"] = settings["emailOpenApp"] || "true";

    const whatsappEnabled = settings["whatsappEnabled"] === "true";
    if (whatsappEnabled) {
      result["whatsappNumber"] = settings["whatsappNumber"] || "";
    }
    result["whatsappMessage"] = settings["whatsappMessage"] || "";
    result["whatsappEnabled"] = whatsappEnabled ? "true" : "false";

    res.json(result);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trust/testimonials
router.get("/trust/testimonials", async (req, res) => {
  try {
    const list = await db
      .select()
      .from(testimonialsTable)
      .where(
        and(
          eq(testimonialsTable.isPublished, true),
          eq(testimonialsTable.isSample, false)
        )
      )
      .orderBy(asc(testimonialsTable.sortOrder), desc(testimonialsTable.id));
    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/testimonials");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trust/reviews/:productId
router.get("/trust/reviews/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 10;
    const page = parseInt(req.query.page as string, 10) || 1;
    const skip = (page - 1) * limit;

    const list = await db
      .select()
      .from(productReviewsTable)
      .where(
        and(
          eq(productReviewsTable.productId, productId),
          eq(productReviewsTable.status, "approved")
        )
      )
      .orderBy(desc(productReviewsTable.submittedAt))
      .limit(limit)
      .offset(skip);

    const countRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productReviewsTable)
      .where(
        and(
          eq(productReviewsTable.productId, productId),
          eq(productReviewsTable.status, "approved")
        )
      );

    const total = countRes[0]?.count || 0;

    res.json({
      reviews: list,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/reviews/:productId");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trust/reviews/:productId/summary
router.get("/trust/reviews/:productId/summary", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }

    const stats = await db
      .select({
        rating: productReviewsTable.rating,
        count: sql<number>`count(*)::int`,
      })
      .from(productReviewsTable)
      .where(
        and(
          eq(productReviewsTable.productId, productId),
          eq(productReviewsTable.status, "approved")
        )
      )
      .groupBy(productReviewsTable.rating);

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalCount = 0;
    let sumRating = 0;

    for (const row of stats) {
      if (row.rating >= 1 && row.rating <= 5) {
        breakdown[row.rating] = row.count;
        totalCount += row.count;
        sumRating += row.rating * row.count;
      }
    }

    const avgRating = totalCount > 0 ? parseFloat((sumRating / totalCount).toFixed(2)) : 0;

    res.json({
      avgRating,
      totalCount,
      breakdown,
    });
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/reviews/:productId/summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trust/customers-count
router.get("/trust/customers-count", async (req, res) => {
  try {
    const settings = await getTrustSettingsMap();
    const baseline = parseInt(settings["customersBaseline"] || "100", 10);
    const countMode = settings["customersCountMode"] || "unique";

    // Query orders table for status='success' or status='active', and NOT refunded/cancelled/fraudulent
    const eligibleOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          inArray(ordersTable.status, ["success", "active"])
        )
      );

    let newCount = 0;
    if (countMode === "unique") {
      const distinctUsers = new Set(eligibleOrders.map((o) => o.clerkUserId).filter(Boolean));
      newCount = distinctUsers.size;
    } else {
      newCount = eligibleOrders.length;
    }

    const displayed = baseline + newCount;
    res.json({ displayed });
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/customers-count");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trust/payment-methods
router.get("/trust/payment-methods", async (req, res) => {
  try {
    await seedDefaultPaymentMethodsIfNeeded();
    const list = await db
      .select()
      .from(paymentMethodsTable)
      .where(eq(paymentMethodsTable.isEnabled, true))
      .orderBy(asc(paymentMethodsTable.sortOrder), desc(paymentMethodsTable.id));
    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/payment-methods");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trust/screenshots
router.get("/trust/screenshots", async (req, res) => {
  try {
    const list = await db
      .select()
      .from(accessScreenshotsTable)
      .where(eq(accessScreenshotsTable.isPublished, true))
      .orderBy(asc(accessScreenshotsTable.sortOrder), desc(accessScreenshotsTable.id));
    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/screenshots");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── AUTH-REQUIRED ENDPOINTS ──────────────────────────────────────────────────

// POST /api/trust/reviews
router.post("/trust/reviews", async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { productId, rating, title, body } = req.body;
    if (!productId || !rating || !body) {
      res.status(400).json({ error: "productId, rating, and body are required" });
      return;
    }

    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) {
      res.status(400).json({ error: "rating must be an integer between 1 and 5" });
      return;
    }

    // Verify eligibility: check orders table for completed order containing productId for this clerkUserId
    const qualifyingOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.clerkUserId, clerkUserId),
          eq(ordersTable.productId, productId),
          inArray(ordersTable.status, ["success", "active"])
        )
      );

    if (qualifyingOrders.length === 0) {
      res.status(403).json({ error: "Not eligible to review this product" });
      return;
    }

    // Prevent duplicate reviews (one per user per product)
    const existingReview = await db
      .select()
      .from(productReviewsTable)
      .where(
        and(
          eq(productReviewsTable.clerkUserId, clerkUserId),
          eq(productReviewsTable.productId, productId)
        )
      );

    if (existingReview.length > 0) {
      res.status(400).json({ error: "You have already reviewed this product" });
      return;
    }

    const order = qualifyingOrders[0];

    // Fetch clerk user info for name
    let customerName = order.customerName || "Customer";
    try {
      const user = await clerkClient.users.getUser(clerkUserId);
      customerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || customerName;
    } catch {
      // fallback to order customer name
    }

    const [review] = await db
      .insert(productReviewsTable)
      .values({
        clerkUserId,
        customerName,
        orderId: order.id,
        productId,
        rating: r,
        title: title || null,
        body,
        status: "pending",
        isVerifiedPurchase: true,
      })
      .returning();

    // Mark prompt as reviewed if exists
    await db
      .update(reviewPromptsTable)
      .set({ reviewed: true })
      .where(
        and(
          eq(reviewPromptsTable.clerkUserId, clerkUserId),
          eq(reviewPromptsTable.productId, productId)
        )
      );

    res.status(201).json(review);
  } catch (err: any) {
    logger.error(err, "Error in POST /api/trust/reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/trust/review-prompts
router.get("/trust/review-prompts", async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get qualifying orders for this user
    const orders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.clerkUserId, clerkUserId),
          inArray(ordersTable.status, ["success", "active"])
        )
      );

    const pendingPrompts = [];

    for (const order of orders) {
      // Check if already reviewed
      const review = await db
        .select()
        .from(productReviewsTable)
        .where(
          and(
            eq(productReviewsTable.clerkUserId, clerkUserId),
            eq(productReviewsTable.productId, order.productId)
          )
        );

      if (review.length > 0) {
        continue;
      }

      // Check existing prompt record
      let [prompt] = await db
        .select()
        .from(reviewPromptsTable)
        .where(
          and(
            eq(reviewPromptsTable.clerkUserId, clerkUserId),
            eq(reviewPromptsTable.orderId, order.id),
            eq(reviewPromptsTable.productId, order.productId)
          )
        );

      if (!prompt) {
        // Create new prompt tracker in DB if it doesn't exist
        const [newPrompt] = await db
          .insert(reviewPromptsTable)
          .values({
            clerkUserId,
            orderId: order.id,
            productId: order.productId,
            promptCount: 0,
            dismissed: false,
            reviewed: false,
            sessionIds: [],
          })
          .returning();
        prompt = newPrompt;
      }

      if (!prompt.dismissed && !prompt.reviewed && prompt.promptCount < 3) {
        pendingPrompts.push(prompt);
      }
    }

    res.json(pendingPrompts);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/trust/review-prompts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/trust/review-prompts/:orderId/:productId/seen
router.post("/trust/review-prompts/:orderId/:productId/seen", async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const orderId = parseInt(req.params.orderId, 10);
    const productId = parseInt(req.params.productId, 10);
    const { sessionId } = req.body;

    if (isNaN(orderId) || isNaN(productId)) {
      res.status(400).json({ error: "Invalid parameters" });
      return;
    }

    let [prompt] = await db
      .select()
      .from(reviewPromptsTable)
      .where(
        and(
          eq(reviewPromptsTable.clerkUserId, clerkUserId),
          eq(reviewPromptsTable.orderId, orderId),
          eq(reviewPromptsTable.productId, productId)
        )
      );

    if (!prompt) {
      const [newPrompt] = await db
        .insert(reviewPromptsTable)
        .values({
          clerkUserId,
          orderId,
          productId,
          promptCount: 0,
          dismissed: false,
          reviewed: false,
          sessionIds: [],
        })
        .returning();
      prompt = newPrompt;
    }

    const sessions = Array.isArray(prompt.sessionIds) ? prompt.sessionIds : [];
    if (sessionId && !sessions.includes(sessionId)) {
      sessions.push(sessionId);
    }

    const [updated] = await db
      .update(reviewPromptsTable)
      .set({
        promptCount: prompt.promptCount + 1,
        lastPromptedAt: new Date(),
        sessionIds: sessions,
      })
      .where(eq(reviewPromptsTable.id, prompt.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in POST /api/trust/review-prompts/:orderId/:productId/seen");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/trust/review-prompts/:orderId/:productId/dismiss
router.post("/trust/review-prompts/:orderId/:productId/dismiss", async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const orderId = parseInt(req.params.orderId, 10);
    const productId = parseInt(req.params.productId, 10);

    if (isNaN(orderId) || isNaN(productId)) {
      res.status(400).json({ error: "Invalid parameters" });
      return;
    }

    const [updated] = await db
      .update(reviewPromptsTable)
      .set({ dismissed: true })
      .where(
        and(
          eq(reviewPromptsTable.clerkUserId, clerkUserId),
          eq(reviewPromptsTable.orderId, orderId),
          eq(reviewPromptsTable.productId, productId)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Review prompt tracker not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in POST /api/trust/review-prompts/:orderId/:productId/dismiss");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────

// GET /api/admin/trust/settings
router.get("/admin/trust/settings", requireAdmin, async (req, res) => {
  try {
    const settings = await getTrustSettingsMap();
    res.json(settings);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/admin/trust/settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/trust/settings
router.put("/admin/trust/settings", requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    for (const [key, val] of Object.entries(body)) {
      const existing = await db
        .select()
        .from(siteTrustSettingsTable)
        .where(eq(siteTrustSettingsTable.key, key));

      if (existing.length > 0) {
        await db
          .update(siteTrustSettingsTable)
          .set({ value: String(val), updatedAt: new Date() })
          .where(eq(siteTrustSettingsTable.key, key));
      } else {
        await db
          .insert(siteTrustSettingsTable)
          .values({ key, value: String(val) });
      }
    }
    const settings = await getTrustSettingsMap();
    res.json(settings);
  } catch (err: any) {
    logger.error(err, "Error in PUT /api/admin/trust/settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/trust/testimonials
router.get("/admin/trust/testimonials", requireAdmin, async (req, res) => {
  try {
    const list = await db
      .select()
      .from(testimonialsTable)
      .orderBy(asc(testimonialsTable.sortOrder), desc(testimonialsTable.id));
    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/admin/trust/testimonials");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/trust/testimonials
router.post("/admin/trust/testimonials", requireAdmin, async (req, res) => {
  try {
    const {
      displayName,
      jobTitle,
      company,
      photoUrl,
      testimonialText,
      rating,
      isSample,
      isPublished,
      permissionObtained,
      isVerified,
      verifiedOrderId,
      sortOrder,
    } = req.body;

    if (!displayName || !testimonialText) {
      res.status(400).json({ error: "displayName and testimonialText are required" });
      return;
    }

    const [created] = await db
      .insert(testimonialsTable)
      .values({
        displayName,
        jobTitle: jobTitle || null,
        company: company || null,
        photoUrl: photoUrl || null,
        testimonialText,
        rating: rating ? parseInt(rating, 10) : null,
        isSample: isSample !== false, // default true
        isPublished: isPublished === true,
        permissionObtained: permissionObtained === true,
        isVerified: isVerified === true,
        verifiedOrderId: verifiedOrderId ? parseInt(verifiedOrderId, 10) : null,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
      })
      .returning();

    res.status(201).json(created);
  } catch (err: any) {
    logger.error(err, "Error in POST /api/admin/trust/testimonials");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/trust/testimonials/:id
router.put("/admin/trust/testimonials/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const updates: Record<string, any> = {};
    const allowed = [
      "displayName",
      "jobTitle",
      "company",
      "photoUrl",
      "testimonialText",
      "rating",
      "isSample",
      "isPublished",
      "permissionObtained",
      "isVerified",
      "verifiedOrderId",
      "sortOrder",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.rating !== undefined) {
      updates.rating = updates.rating ? parseInt(updates.rating, 10) : null;
    }
    if (updates.verifiedOrderId !== undefined) {
      updates.verifiedOrderId = updates.verifiedOrderId ? parseInt(updates.verifiedOrderId, 10) : null;
    }
    if (updates.sortOrder !== undefined) {
      updates.sortOrder = parseInt(updates.sortOrder, 10) || 0;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(testimonialsTable)
      .set(updates)
      .where(eq(testimonialsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in PUT /api/admin/trust/testimonials/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/trust/testimonials/:id
router.delete("/admin/trust/testimonials/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [deleted] = await db
      .delete(testimonialsTable)
      .where(eq(testimonialsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error(err, "Error in DELETE /api/admin/trust/testimonials/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/trust/testimonials/:id/reorder
router.post("/admin/trust/testimonials/:id/reorder", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { sortOrder } = req.body;

    if (isNaN(id) || sortOrder === undefined) {
      res.status(400).json({ error: "id and sortOrder are required" });
      return;
    }

    const [updated] = await db
      .update(testimonialsTable)
      .set({ sortOrder: parseInt(sortOrder, 10) || 0, updatedAt: new Date() })
      .where(eq(testimonialsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in POST /api/admin/trust/testimonials/:id/reorder");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/trust/reviews - list all reviews with filters (status, productId, rating, search)
router.get("/admin/trust/reviews", requireAdmin, async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    const rating = typeof req.query.rating === "string" ? req.query.rating : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const conditions = [];
    if (status) {
      conditions.push(eq(productReviewsTable.status, status));
    }
    if (productId) {
      conditions.push(eq(productReviewsTable.productId, parseInt(productId, 10)));
    }
    if (rating) {
      conditions.push(eq(productReviewsTable.rating, parseInt(rating, 10)));
    }
    if (search) {
      conditions.push(
        sql`(lower(${productReviewsTable.customerName}) LIKE ${"%" + search.toLowerCase() + "%"} OR lower(${productReviewsTable.body}) LIKE ${"%" + search.toLowerCase() + "%"})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(productReviewsTable)
      .where(whereClause)
      .orderBy(desc(productReviewsTable.submittedAt));

    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/admin/trust/reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/trust/reviews/:id - update review status, add admin reply
router.put("/admin/trust/reviews/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const { status, adminReply } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (status) {
      updates.status = status;
    }
    if (adminReply !== undefined) {
      updates.adminReply = adminReply || null;
      updates.adminRepliedAt = adminReply ? new Date() : null;
    }

    const [updated] = await db
      .update(productReviewsTable)
      .set(updates)
      .where(eq(productReviewsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in PUT /api/admin/trust/reviews/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/trust/reviews/:id - delete review
router.delete("/admin/trust/reviews/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [deleted] = await db
      .delete(productReviewsTable)
      .where(eq(productReviewsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error(err, "Error in DELETE /api/admin/trust/reviews/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/trust/customers-count - get full stats (baseline, newCustomers, total, lastUpdated, auditLog)
router.get("/admin/trust/customers-count", requireAdmin, async (req, res) => {
  try {
    const settings = await getTrustSettingsMap();
    const baseline = parseInt(settings["customersBaseline"] || "100", 10);
    const countMode = settings["customersCountMode"] || "unique";

    const eligibleOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          inArray(ordersTable.status, ["success", "active"])
        )
      );

    let newCustomers = 0;
    if (countMode === "unique") {
      const distinctUsers = new Set(eligibleOrders.map((o) => o.clerkUserId).filter(Boolean));
      newCustomers = distinctUsers.size;
    } else {
      newCustomers = eligibleOrders.length;
    }

    const total = baseline + newCustomers;
    const auditLogRaw = settings["customersAuditLog"];
    let auditLog = [];
    try {
      if (auditLogRaw) {
        auditLog = JSON.parse(auditLogRaw);
      }
    } catch {
      // ignore
    }

    res.json({
      baseline,
      countMode,
      newCustomers,
      total,
      auditLog,
    });
  } catch (err: any) {
    logger.error(err, "Error in GET /api/admin/trust/customers-count");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/trust/customers-count - update baseline or countMode (log change to auditLog)
router.put("/admin/trust/customers-count", requireAdmin, async (req, res) => {
  try {
    const { baseline, countMode, reason } = req.body;
    const settings = await getTrustSettingsMap();

    const oldBaseline = settings["customersBaseline"] || "100";
    const oldMode = settings["customersCountMode"] || "unique";
    const auditLogRaw = settings["customersAuditLog"];
    let auditLog = [];
    try {
      if (auditLogRaw) {
        auditLog = JSON.parse(auditLogRaw);
      }
    } catch {
      // ignore
    }

    if (baseline !== undefined && String(baseline) !== oldBaseline) {
      const entry = {
        date: new Date().toISOString(),
        oldValue: oldBaseline,
        newValue: String(baseline),
        reason: reason || "Manual correction",
      };
      auditLog.push(entry);

      // Save baseline
      const exB = await db.select().from(siteTrustSettingsTable).where(eq(siteTrustSettingsTable.key, "customersBaseline"));
      if (exB.length > 0) {
        await db.update(siteTrustSettingsTable).set({ value: String(baseline), updatedAt: new Date() }).where(eq(siteTrustSettingsTable.key, "customersBaseline"));
      } else {
        await db.insert(siteTrustSettingsTable).values({ key: "customersBaseline", value: String(baseline) });
      }

      // Save auditLog
      const exA = await db.select().from(siteTrustSettingsTable).where(eq(siteTrustSettingsTable.key, "customersAuditLog"));
      if (exA.length > 0) {
        await db.update(siteTrustSettingsTable).set({ value: JSON.stringify(auditLog), updatedAt: new Date() }).where(eq(siteTrustSettingsTable.key, "customersAuditLog"));
      } else {
        await db.insert(siteTrustSettingsTable).values({ key: "customersAuditLog", value: JSON.stringify(auditLog) });
      }
    }

    if (countMode !== undefined && String(countMode) !== oldMode) {
      const exM = await db.select().from(siteTrustSettingsTable).where(eq(siteTrustSettingsTable.key, "customersCountMode"));
      if (exM.length > 0) {
        await db.update(siteTrustSettingsTable).set({ value: String(countMode), updatedAt: new Date() }).where(eq(siteTrustSettingsTable.key, "customersCountMode"));
      } else {
        await db.insert(siteTrustSettingsTable).values({ key: "customersCountMode", value: String(countMode) });
      }
    }

    const updatedSettings = await getTrustSettingsMap();
    res.json(updatedSettings);
  } catch (err: any) {
    logger.error(err, "Error in PUT /api/admin/trust/customers-count");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/trust/payment-methods - list all
router.get("/admin/trust/payment-methods", requireAdmin, async (req, res) => {
  try {
    await seedDefaultPaymentMethodsIfNeeded();
    const list = await db
      .select()
      .from(paymentMethodsTable)
      .orderBy(asc(paymentMethodsTable.sortOrder), desc(paymentMethodsTable.id));
    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/admin/trust/payment-methods");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/trust/payment-methods - create
router.post("/admin/trust/payment-methods", requireAdmin, async (req, res) => {
  try {
    const { name, logoUrl, logoSvg, isEnabled, sortOrder } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const [created] = await db
      .insert(paymentMethodsTable)
      .values({
        name,
        logoUrl: logoUrl || null,
        logoSvg: logoSvg || null,
        isEnabled: isEnabled !== false,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
      })
      .returning();

    res.status(201).json(created);
  } catch (err: any) {
    logger.error(err, "Error in POST /api/admin/trust/payment-methods");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/trust/payment-methods/:id - update
router.put("/admin/trust/payment-methods/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const updates: Record<string, any> = {};
    const allowed = ["name", "logoUrl", "logoSvg", "isEnabled", "sortOrder"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.sortOrder !== undefined) {
      updates.sortOrder = parseInt(updates.sortOrder, 10) || 0;
    }

    const [updated] = await db
      .update(paymentMethodsTable)
      .set(updates)
      .where(eq(paymentMethodsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Payment method not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in PUT /api/admin/trust/payment-methods/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/trust/payment-methods/:id - delete
router.delete("/admin/trust/payment-methods/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [deleted] = await db
      .delete(paymentMethodsTable)
      .where(eq(paymentMethodsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Payment method not found" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error(err, "Error in DELETE /api/admin/trust/payment-methods/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/trust/payment-methods/reorder - update sortOrders
router.post("/admin/trust/payment-methods/reorder", requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // array of { id: number, sortOrder: number }
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: "orders array is required" });
      return;
    }

    for (const item of orders) {
      if (item.id !== undefined && item.sortOrder !== undefined) {
        await db
          .update(paymentMethodsTable)
          .set({ sortOrder: parseInt(item.sortOrder, 10) || 0 })
          .where(eq(paymentMethodsTable.id, parseInt(item.id, 10)));
      }
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error(err, "Error in POST /api/admin/trust/payment-methods/reorder");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/trust/screenshots - list all
router.get("/admin/trust/screenshots", requireAdmin, async (req, res) => {
  try {
    const list = await db
      .select()
      .from(accessScreenshotsTable)
      .orderBy(asc(accessScreenshotsTable.sortOrder), desc(accessScreenshotsTable.id));
    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /api/admin/trust/screenshots");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/trust/screenshots - create
router.post("/admin/trust/screenshots", requireAdmin, async (req, res) => {
  try {
    const { stepNumber, caption, imageUrl, altText, isPublished, sortOrder } = req.body;
    if (stepNumber === undefined || !caption || !imageUrl || !altText) {
      res.status(400).json({ error: "stepNumber, caption, imageUrl, and altText are required" });
      return;
    }

    const [created] = await db
      .insert(accessScreenshotsTable)
      .values({
        stepNumber: parseInt(stepNumber, 10) || 1,
        caption,
        imageUrl,
        altText,
        isPublished: isPublished === true,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
      })
      .returning();

    res.status(201).json(created);
  } catch (err: any) {
    logger.error(err, "Error in POST /api/admin/trust/screenshots");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/trust/screenshots/:id - update
router.put("/admin/trust/screenshots/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowed = ["stepNumber", "caption", "imageUrl", "altText", "isPublished", "sortOrder"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.stepNumber !== undefined) {
      updates.stepNumber = parseInt(updates.stepNumber, 10) || 1;
    }
    if (updates.sortOrder !== undefined) {
      updates.sortOrder = parseInt(updates.sortOrder, 10) || 0;
    }

    const [updated] = await db
      .update(accessScreenshotsTable)
      .set(updates)
      .where(eq(accessScreenshotsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Screenshot not found" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in PUT /api/admin/trust/screenshots/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/trust/screenshots/:id - delete
router.delete("/admin/trust/screenshots/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [deleted] = await db
      .delete(accessScreenshotsTable)
      .where(eq(accessScreenshotsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Screenshot not found" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error(err, "Error in DELETE /api/admin/trust/screenshots/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/trust/screenshots/reorder - update sortOrders
router.post("/admin/trust/screenshots/reorder", requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // array of { id: number, sortOrder: number }
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: "orders array is required" });
      return;
    }

    for (const item of orders) {
      if (item.id !== undefined && item.sortOrder !== undefined) {
        await db
          .update(accessScreenshotsTable)
          .set({ sortOrder: parseInt(item.sortOrder, 10) || 0, updatedAt: new Date() })
          .where(eq(accessScreenshotsTable.id, parseInt(item.id, 10)));
      }
    }

    res.json({ ok: true });
  } catch (err: any) {
    logger.error(err, "Error in POST /api/admin/trust/screenshots/reorder");
    res.status(500).json({ error: "Internal server error" });
  }
});


// PUT /admin/trust/reviews/:id/status — approve, reject, hide, restore
router.put("/admin/trust/reviews/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }
    const { status } = req.body;
    const validStatuses = ["pending", "approved", "rejected", "hidden"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }
    const [updated] = await db
      .update(productReviewsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(productReviewsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Review not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in PUT /admin/trust/reviews/:id/status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/trust/reviews/:id/reply — add or edit admin reply
router.put("/admin/trust/reviews/:id/reply", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }
    const { reply } = req.body;
    if (typeof reply !== "string") {
      res.status(400).json({ error: "reply must be a string" });
      return;
    }
    const [updated] = await db
      .update(productReviewsTable)
      .set({ adminReply: reply.trim() || null, adminRepliedAt: reply.trim() ? new Date() : null, updatedAt: new Date() })
      .where(eq(productReviewsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Review not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in PUT /admin/trust/reviews/:id/reply");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/trust/counter — alias for customers-count
router.get("/admin/trust/counter", requireAdmin, async (req, res) => {
  try {
    const settings = await getTrustSettingsMap();
    const baseline = parseInt(settings["customersBaseline"] || "100", 10);
    const countMode = settings["customersCountMode"] || "unique";
    const auditLog = settings["customersAuditLog"] ? JSON.parse(settings["customersAuditLog"]) : [];

    const eligibleOrders = await db
      .select()
      .from(ordersTable)
      .where(inArray(ordersTable.status, ["success", "active"]));

    let newCount = 0;
    if (countMode === "unique") {
      const distinctUsers = new Set(eligibleOrders.map((o) => o.clerkUserId).filter(Boolean));
      newCount = distinctUsers.size;
    } else {
      newCount = eligibleOrders.length;
    }

    const lastUpdated = settings["customersLastUpdated"] || null;

    res.json({
      baseline,
      countMode,
      newCount,
      displayed: baseline + newCount,
      lastUpdated,
      auditLog,
    });
  } catch (err: any) {
    logger.error(err, "Error in GET /admin/trust/counter");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/trust/counter — update baseline / countMode
router.put("/admin/trust/counter", requireAdmin, async (req, res) => {
  try {
    const { baseline, countMode, reason } = req.body;
    const updates: Array<{ key: string; value: string }> = [];

    if (baseline !== undefined) {
      const b = parseInt(baseline, 10);
      if (isNaN(b) || b < 0) {
        res.status(400).json({ error: "baseline must be a non-negative integer" });
        return;
      }
      // Fetch old baseline for audit
      const settings = await getTrustSettingsMap();
      const oldBaseline = settings["customersBaseline"] || "100";
      const auditLog = settings["customersAuditLog"] ? JSON.parse(settings["customersAuditLog"]) : [];
      auditLog.push({ date: new Date().toISOString(), oldValue: oldBaseline, newValue: String(b), reason: reason || "Manual correction" });
      updates.push({ key: "customersBaseline", value: String(b) });
      updates.push({ key: "customersAuditLog", value: JSON.stringify(auditLog) });
    }

    if (countMode) {
      if (!["unique", "orders"].includes(countMode)) {
        res.status(400).json({ error: "countMode must be unique or orders" });
        return;
      }
      updates.push({ key: "customersCountMode", value: countMode });
    }

    updates.push({ key: "customersLastUpdated", value: new Date().toISOString() });

    for (const u of updates) {
      const existing = await db.select().from(siteTrustSettingsTable).where(eq(siteTrustSettingsTable.key, u.key));
      if (existing.length > 0) {
        await db.update(siteTrustSettingsTable).set({ value: u.value, updatedAt: new Date() }).where(eq(siteTrustSettingsTable.key, u.key));
      } else {
        await db.insert(siteTrustSettingsTable).values({ key: u.key, value: u.value });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error(err, "Error in PUT /admin/trust/counter");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/trust/payments — alias for payment-methods list
router.get("/admin/trust/payments", requireAdmin, async (req, res) => {
  try {
    await seedDefaultPaymentMethodsIfNeeded();
    const list = await db.select().from(paymentMethodsTable).orderBy(asc(paymentMethodsTable.sortOrder));
    res.json(list);
  } catch (err: any) {
    logger.error(err, "Error in GET /admin/trust/payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/trust/payments — create payment method
router.post("/admin/trust/payments", requireAdmin, async (req, res) => {
  try {
    const { name, isEnabled, sortOrder } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [created] = await db.insert(paymentMethodsTable).values({ name, isEnabled: isEnabled !== false, sortOrder: sortOrder ?? 0 }).returning();
    res.status(201).json(created);
  } catch (err: any) {
    logger.error(err, "Error in POST /admin/trust/payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/trust/payments/:id
router.put("/admin/trust/payments/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { name, isEnabled, sortOrder } = req.body;
    const updates: Partial<{ name: string; isEnabled: boolean; sortOrder: number }> = {};
    if (name !== undefined) updates.name = name;
    if (isEnabled !== undefined) updates.isEnabled = isEnabled;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const [updated] = await db.update(paymentMethodsTable).set(updates).where(eq(paymentMethodsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    logger.error(err, "Error in PUT /admin/trust/payments/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/trust/payments/:id
router.delete("/admin/trust/payments/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    logger.error(err, "Error in DELETE /admin/trust/payments/:id");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/trust/payments/reorder
router.post("/admin/trust/payments/reorder", requireAdmin, async (req, res) => {
  try {
    const { order } = req.body; // [{id, sortOrder}, ...]
    if (!Array.isArray(order)) { res.status(400).json({ error: "order must be an array" }); return; }
    for (const item of order) {
      if (item.id && item.sortOrder !== undefined) {
        await db.update(paymentMethodsTable).set({ sortOrder: item.sortOrder }).where(eq(paymentMethodsTable.id, item.id));
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    logger.error(err, "Error in POST /admin/trust/payments/reorder");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
