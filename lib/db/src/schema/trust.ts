import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// site_trust_settings - stores all trust/support config
// Fields: id (serial pk), key (text unique), value (text), updatedAt (timestamp)
// Use this as a key-value store for: businessEmail, emailEnabled, emailOpenApp,
//   whatsappNumber, whatsappMessage, whatsappEnabled,
//   customersBaseline (default '100'), customersCountMode ('unique'|'orders'),
//   customersManualCorrection, customersAuditLog (jsonb)
export const siteTrustSettingsTable = pgTable("site_trust_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSiteTrustSettingSchema = createInsertSchema(siteTrustSettingsTable).omit({ id: true, updatedAt: true });
export type InsertSiteTrustSetting = z.infer<typeof insertSiteTrustSettingSchema>;
export type SiteTrustSetting = typeof siteTrustSettingsTable.$inferSelect;

// testimonials
// Fields: id serial pk, displayName text, jobTitle text nullable, company text nullable,
//   photoUrl text nullable, testimonialText text, rating int nullable (1-5),
//   isSample boolean default true, isPublished boolean default false,
//   permissionObtained boolean default false, isVerified boolean default false,
//   verifiedOrderId int nullable, sortOrder int default 0,
//   createdAt timestamp, updatedAt timestamp
export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  jobTitle: text("job_title"),
  company: text("company"),
  photoUrl: text("photo_url"),
  testimonialText: text("testimonial_text").notNull(),
  rating: integer("rating"),
  isSample: boolean("is_sample").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(false),
  permissionObtained: boolean("permission_obtained").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedOrderId: integer("verified_order_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;

// product_reviews
// Fields: id serial pk, clerkUserId text, customerName text, orderId int,
//   productId int, rating int (1-5), title text nullable, body text,
//   status text default 'pending' (pending|approved|rejected|hidden),
//   isVerifiedPurchase boolean default false,
//   adminReply text nullable, adminRepliedAt timestamp nullable,
//   submittedAt timestamp, updatedAt timestamp
export const productReviewsTable = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  customerName: text("customer_name").notNull(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"), // pending|approved|rejected|hidden
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
  adminReply: text("admin_reply"),
  adminRepliedAt: timestamp("admin_replied_at"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductReviewSchema = createInsertSchema(productReviewsTable).omit({ id: true, submittedAt: true, updatedAt: true });
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;
export type ProductReview = typeof productReviewsTable.$inferSelect;

// review_prompts - tracks how many times a user has been shown a review prompt per order
// Fields: id serial pk, clerkUserId text, orderId int, productId int,
//   promptCount int default 0, lastPromptedAt timestamp nullable,
//   dismissed boolean default false, reviewed boolean default false,
//   sessionIds jsonb default '[]' (store session IDs shown so far)
export const reviewPromptsTable = pgTable("review_prompts", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  promptCount: integer("prompt_count").notNull().default(0),
  lastPromptedAt: timestamp("last_prompted_at"),
  dismissed: boolean("dismissed").notNull().default(false),
  reviewed: boolean("reviewed").notNull().default(false),
  sessionIds: jsonb("session_ids").notNull().default([]), // store session IDs shown so far
});

export const insertReviewPromptSchema = createInsertSchema(reviewPromptsTable).omit({ id: true });
export type InsertReviewPrompt = z.infer<typeof insertReviewPromptSchema>;
export type ReviewPrompt = typeof reviewPromptsTable.$inferSelect;

// payment_methods
// Fields: id serial pk, name text, logoUrl text nullable, logoSvg text nullable,
//   isEnabled boolean default true, sortOrder int default 0
export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  logoSvg: text("logo_svg"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethodsTable).omit({ id: true });
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;

// access_screenshots
// Fields: id serial pk, stepNumber int, caption text, imageUrl text,
//   altText text, isPublished boolean default false, sortOrder int default 0,
//   createdAt timestamp, updatedAt timestamp
export const accessScreenshotsTable = pgTable("access_screenshots", {
  id: serial("id").primaryKey(),
  stepNumber: integer("step_number").notNull(),
  caption: text("caption").notNull(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAccessScreenshotSchema = createInsertSchema(accessScreenshotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccessScreenshot = z.infer<typeof insertAccessScreenshotSchema>;
export type AccessScreenshot = typeof accessScreenshotsTable.$inferSelect;
