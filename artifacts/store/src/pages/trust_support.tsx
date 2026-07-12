import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Trash2,
  Plus,
  Loader2,
  Star,
  MessageSquare,
  BadgeCheck,
  Smartphone,
  Landmark,
  LayoutList,
  ArrowUp,
  ArrowDown,
  HelpCircle,
} from "lucide-react";

interface TrustSupportPanelProps {
  token: string;
}

export function TrustSupportPanel({ token }: TrustSupportPanelProps) {
  const [subTab, setSubTab] = useState<
    | "contact"
    | "whatsapp"
    | "testimonials"
    | "reviews"
    | "counter"
    | "payments"
    | "screenshots"
  >("contact");

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // --- TAB 1: Contact Info ---
  const [businessEmail, setBusinessEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailOpenApp, setEmailOpenApp] = useState(false);

  const loadContactInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/settings`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setBusinessEmail(data.businessEmail || "");
        setEmailEnabled(!!data.emailEnabled);
        setEmailOpenApp(!!data.emailOpenApp);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveContactInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          businessEmail,
          emailEnabled,
          emailOpenApp,
        }),
      });
      if (res.ok) {
        toast({
          title: "Contact Info Saved",
          description: "Your business contact settings have been updated.",
        });
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error Saving",
        description: err.message || "Failed to update contact info.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- TAB 2: WhatsApp ---
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  const loadWhatsApp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/settings`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappNumber(data.whatsappNumber || "");
        setWhatsappMessage(data.whatsappMessage || "");
        setWhatsappEnabled(!!data.whatsappEnabled);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsApp = async () => {
    // Validate number: starts with + and contains only digits/spaces after
    const phoneRegex = /^\+[0-9\s]+$/;
    if (whatsappEnabled && !phoneRegex.test(whatsappNumber)) {
      toast({
        title: "Validation Error",
        description: "WhatsApp number must start with + and contain only digits and spaces.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          whatsappNumber,
          whatsappMessage,
          whatsappEnabled,
        }),
      });
      if (res.ok) {
        toast({
          title: "WhatsApp Settings Saved",
          description: "Your WhatsApp configuration has been updated.",
        });
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error Saving",
        description: err.message || "Failed to update WhatsApp settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Preview helper
  const encodedMsg = encodeURIComponent(whatsappMessage);
  const whatsappPreviewUrl = `https://wa.me/${whatsappNumber.replace(/[\s+]/g, "")}${encodedMsg ? `?text=${encodedMsg}` : ""}`;

  // --- TAB 3: Testimonials ---
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [testimonialDialog, setTestimonialDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: any;
  }>({ open: false, mode: "add", data: null });
  const [deleteTestimonialConfirm, setDeleteTestimonialConfirm] = useState<string | null>(null);

  const loadTestimonials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/testimonials`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        setTestimonials(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = testimonialDialog.mode === "edit";
    const url = isEdit
      ? `/api/admin/trust/testimonials/${testimonialDialog.data.id}`
      : `/api/admin/trust/testimonials`;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(testimonialDialog.data),
      });
      if (res.ok) {
        toast({
          title: isEdit ? "Testimonial Updated" : "Testimonial Added",
          description: "Successfully updated testimonial records.",
        });
        setTestimonialDialog({ open: false, mode: "add", data: null });
        loadTestimonials();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save testimonial.",
        variant: "destructive",
      });
    }
  };

  const deleteTestimonial = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/trust/testimonials/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (res.ok) {
        toast({
          title: "Deleted",
          description: "Testimonial deleted successfully.",
        });
        loadTestimonials();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete testimonial.",
        variant: "destructive",
      });
    } finally {
      setDeleteTestimonialConfirm(null);
    }
  };

  const toggleTestimonialPublished = async (testimonial: any) => {
    try {
      const res = await fetch(`/api/admin/trust/testimonials/${testimonial.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          ...testimonial,
          isPublished: !testimonial.isPublished,
        }),
      });
      if (res.ok) {
        toast({
          title: "Status Updated",
          description: `Testimonial is now ${!testimonial.isPublished ? "published" : "draft"}.`,
        });
        loadTestimonials();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to toggle status.",
        variant: "destructive",
      });
    }
  };

  // --- TAB 4: Reviews ---
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewFilters, setReviewFilters] = useState({
    status: "all",
    productSearch: "",
    rating: "",
  });
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; review: any; text: string }>({
    open: false,
    review: null,
    text: "",
  });
  const [deleteReviewConfirm, setDeleteReviewConfirm] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (reviewFilters.status !== "all") params.append("status", reviewFilters.status);
      if (reviewFilters.productSearch) params.append("search", reviewFilters.productSearch);
      if (reviewFilters.rating) params.append("rating", reviewFilters.rating);

      const res = await fetch(`/api/admin/trust/reviews?${params.toString()}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateReviewStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/trust/reviews/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({
          title: "Review Updated",
          description: `Review status changed to ${status}.`,
        });
        loadReviews();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update review status.",
        variant: "destructive",
      });
    }
  };

  const deleteReview = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/trust/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (res.ok) {
        toast({
          title: "Review Deleted",
          description: "Review removed successfully.",
        });
        loadReviews();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete review.",
        variant: "destructive",
      });
    } finally {
      setDeleteReviewConfirm(null);
    }
  };

  const saveReply = async () => {
    try {
      const res = await fetch(`/api/admin/trust/reviews/${replyDialog.review.id}/reply`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ reply: replyDialog.text }),
      });
      if (res.ok) {
        toast({
          title: "Reply Saved",
          description: "Your official response has been recorded.",
        });
        setReplyDialog({ open: false, review: null, text: "" });
        loadReviews();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to submit reply.",
        variant: "destructive",
      });
    }
  };

  // --- TAB 5: Customer Counter ---
  const [counterBaseline, setCounterBaseline] = useState<number>(0);
  const [counterMode, setCounterMode] = useState<
    "Unique Customers Served" | "Successful Orders Completed"
  >("Unique Customers Served");
  const [newVerifiedCustomers, setNewVerifiedCustomers] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [counterReason, setCounterReason] = useState("");
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  const loadCounter = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/counter`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setCounterBaseline(data.baseline || 0);
        setCounterMode(data.countMode || "Unique Customers Served");
        setNewVerifiedCustomers(data.verifiedCount || 0);
        setLastUpdated(data.lastUpdated || "");
        setAuditHistory(data.auditLog || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveCounter = async () => {
    if (!counterReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please specify a reason for modifying the customer counter baseline.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/counter`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          baseline: counterBaseline,
          countMode: counterMode,
          reason: counterReason,
        }),
      });
      if (res.ok) {
        toast({
          title: "Counter Updated",
          description: "Customer counter settings updated successfully.",
        });
        setCounterReason("");
        loadCounter();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error Saving",
        description: err.message || "Failed to update counter.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- TAB 6: Payment Methods ---
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; name: string; enabled: boolean }>({
    open: false,
    name: "",
    enabled: true,
  });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/payments`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        setPaymentMethods(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async () => {
    if (!paymentDialog.name.trim()) return;
    try {
      const res = await fetch(`/api/admin/trust/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          name: paymentDialog.name,
          enabled: paymentDialog.enabled,
          sortOrder: paymentMethods.length + 1,
        }),
      });
      if (res.ok) {
        toast({
          title: "Payment Method Added",
          description: "Payment option added successfully.",
        });
        setPaymentDialog({ open: false, name: "", enabled: true });
        loadPayments();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add payment option.",
        variant: "destructive",
      });
    }
  };

  const togglePaymentEnabled = async (method: any) => {
    try {
      const res = await fetch(`/api/admin/trust/payments/${method.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          ...method,
          enabled: !method.enabled,
        }),
      });
      if (res.ok) {
        toast({
          title: "Status Updated",
          description: `${method.name} is now ${!method.enabled ? "enabled" : "disabled"}.`,
        });
        loadPayments();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save status.",
        variant: "destructive",
      });
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/trust/payments/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (res.ok) {
        toast({
          title: "Deleted",
          description: "Payment option removed.",
        });
        loadPayments();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete payment option.",
        variant: "destructive",
      });
    }
  };

  const movePayment = async (index: number, direction: "up" | "down") => {
    const newList = [...paymentMethods];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;

    // Swap elements
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Re-assign sortOrder
    const updatedList = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setPaymentMethods(updatedList);
  };

  const savePaymentOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/payments/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ payments: paymentMethods }),
      });
      if (res.ok) {
        toast({
          title: "Order Saved",
          description: "Payment option sort order has been saved successfully.",
        });
        loadPayments();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error Reordering",
        description: err.message || "Failed to save new order.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- TAB 7: Screenshots ---
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [screenshotDialog, setScreenshotDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    data: any;
  }>({ open: false, mode: "add", data: null });
  const [deleteScreenshotConfirm, setDeleteScreenshotConfirm] = useState<string | null>(null);

  const loadScreenshots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/screenshots`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        setScreenshots(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveScreenshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = screenshotDialog.mode === "edit";
    const url = isEdit
      ? `/api/admin/trust/screenshots/${screenshotDialog.data.id}`
      : `/api/admin/trust/screenshots`;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          ...screenshotDialog.data,
          stepNumber: Number(screenshotDialog.data.stepNumber),
          sortOrder: screenshotDialog.data.sortOrder ? Number(screenshotDialog.data.sortOrder) : screenshots.length + 1,
        }),
      });
      if (res.ok) {
        toast({
          title: isEdit ? "Screenshot Updated" : "Screenshot Added",
          description: "Successfully updated accessibility screenshots.",
        });
        setScreenshotDialog({ open: false, mode: "add", data: null });
        loadScreenshots();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save screenshot details.",
        variant: "destructive",
      });
    }
  };

  const deleteScreenshot = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/trust/screenshots/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (res.ok) {
        toast({
          title: "Deleted",
          description: "Screenshot removed successfully.",
        });
        loadScreenshots();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete screenshot.",
        variant: "destructive",
      });
    } finally {
      setDeleteScreenshotConfirm(null);
    }
  };

  const toggleScreenshotPublished = async (screenshot: any) => {
    try {
      const res = await fetch(`/api/admin/trust/screenshots/${screenshot.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          ...screenshot,
          isPublished: !screenshot.isPublished,
        }),
      });
      if (res.ok) {
        toast({
          title: "Status Updated",
          description: `Screenshot is now ${!screenshot.isPublished ? "published" : "draft"}.`,
        });
        loadScreenshots();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to toggle status.",
        variant: "destructive",
      });
    }
  };

  const moveScreenshot = async (index: number, direction: "up" | "down") => {
    const newList = [...screenshots];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;

    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    const updatedList = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setScreenshots(updatedList);
  };

  const saveScreenshotOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trust/screenshots/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ screenshots }),
      });
      if (res.ok) {
        toast({
          title: "Order Saved",
          description: "Accessibility screenshots reordered successfully.",
        });
        loadScreenshots();
      } else {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      toast({
        title: "Error Reordering",
        description: err.message || "Failed to save order.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Switch between tabs triggers proper fetch
  useEffect(() => {
    if (subTab === "contact") loadContactInfo();
    if (subTab === "whatsapp") loadWhatsApp();
    if (subTab === "testimonials") loadTestimonials();
    if (subTab === "reviews") loadReviews();
    if (subTab === "counter") loadCounter();
    if (subTab === "payments") loadPayments();
    if (subTab === "screenshots") loadScreenshots();
  }, [subTab, reviewFilters.status, reviewFilters.rating]); // Trigger refetches on review filters

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap -mb-px gap-x-6">
          {[
            { id: "contact", label: "Contact Info" },
            { id: "whatsapp", label: "WhatsApp" },
            { id: "testimonials", label: "Testimonials" },
            { id: "reviews", label: "Reviews" },
            { id: "counter", label: "Customer Counter" },
            { id: "payments", label: "Payment Methods" },
            { id: "screenshots", label: "Screenshots" },
          ].map((tabInfo) => (
            <button
              key={tabInfo.id}
              onClick={() => setSubTab(tabInfo.id as any)}
              className={`py-3 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                subTab === tabInfo.id
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tabInfo.label}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* SUB-TAB 1: Contact Info */}
      {!loading && subTab === "contact" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 max-w-lg">
          <div>
            <h3 className="text-lg font-heading font-bold text-foreground mb-1">Contact Info</h3>
            <p className="text-xs text-muted-foreground">
              Configure details shown to customers seeking email and technical support.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Business Email
              </label>
              <Input
                type="email"
                placeholder="support@example.com"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-700">Enable Email Contact</p>
                <p className="text-xs text-gray-500">Allow users to reach you via business email</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-700">Open in Email App</p>
                <p className="text-xs text-gray-500">Force mailto link behavior instead of raw text</p>
              </div>
              <Switch checked={emailOpenApp} onCheckedChange={setEmailOpenApp} />
            </div>

            <Button onClick={saveContactInfo} className="w-full font-bold gap-2">
              <Save className="w-4 h-4" /> Save Contact Info
            </Button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: WhatsApp */}
      {!loading && subTab === "whatsapp" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 max-w-lg">
          <div>
            <h3 className="text-lg font-heading font-bold text-foreground mb-1">WhatsApp Integration</h3>
            <p className="text-xs text-muted-foreground">
              Let users chat with your support team directly on WhatsApp.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                WhatsApp Number <span className="text-muted-foreground lowercase font-normal">(e.g. +2348123456789)</span>
              </label>
              <Input
                type="text"
                placeholder="+2348000000000"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Default Message
              </label>
              <Textarea
                placeholder="Hello! I need help with my SEO Tools subscription..."
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-700">Enable WhatsApp Support</p>
                <p className="text-xs text-gray-500">Show WhatsApp contact options across site</p>
              </div>
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>

            {whatsappNumber && (
              <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl">
                <p className="text-xs font-bold text-sky-800 uppercase tracking-wide mb-1">Preview Link</p>
                <a
                  href={whatsappPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-600 break-all underline hover:text-sky-800 block"
                >
                  {whatsappPreviewUrl}
                </a>
              </div>
            )}

            <Button onClick={saveWhatsApp} className="w-full font-bold gap-2">
              <Save className="w-4 h-4" /> Save WhatsApp Settings
            </Button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Testimonials */}
      {!loading && subTab === "testimonials" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm font-medium flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-bold">Sample Content Warning</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Sample testimonials are pre-loaded for reference only. Edit them with real customer content and obtain permission before publishing.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-bold text-foreground">Customer Testimonials</h3>
            <Button
              onClick={() =>
                setTestimonialDialog({
                  open: true,
                  mode: "add",
                  data: {
                    displayName: "",
                    jobTitle: "",
                    company: "",
                    photoUrl: "",
                    testimonialText: "",
                    rating: 5,
                    isSample: true,
                    isPublished: false,
                    permissionObtained: false,
                    isVerified: false,
                    sortOrder: testimonials.length + 1,
                  },
                })
              }
              className="bg-primary hover:bg-primary/90 text-white font-bold gap-2"
            >
              <Plus className="w-4 h-4" /> Add Testimonial
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Consent</th>
                  <th className="p-4 text-center">Verified</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {testimonials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No testimonials found. Add your first customer endorsement!
                    </td>
                  </tr>
                ) : (
                  testimonials.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          {t.displayName}
                          {t.isSample && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 rounded">
                              Sample
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.jobTitle} {t.company ? `@ ${t.company}` : ""}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-4 h-4 fill-current" /> {t.rating}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleTestimonialPublished(t)}
                          className={`px-2 py-1 text-xs font-bold rounded-lg ${
                            t.isPublished
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {t.isPublished ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-xs font-bold ${
                            t.permissionObtained ? "text-green-600" : "text-rose-500"
                          }`}
                        >
                          {t.permissionObtained ? "Obtained" : "Missing"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-xs font-bold ${
                            t.isVerified ? "text-blue-600" : "text-gray-400"
                          }`}
                        >
                          {t.isVerified ? "Verified User" : "Unverified"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTestimonialDialog({ open: true, mode: "edit", data: t })}
                          className="text-primary"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTestimonialConfirm(t.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Reviews */}
      {!loading && subTab === "reviews" && (
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl text-sky-800 text-xs font-medium">
            💡 Reviews may only be approved, rejected, hidden, or replied to — not edited. The verified badge is automatically verified based on transaction history.
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={reviewFilters.status}
                onChange={(e) => setReviewFilters({ ...reviewFilters, status: e.target.value })}
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-xs font-bold"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="hidden">Hidden</option>
              </select>

              <select
                value={reviewFilters.rating}
                onChange={(e) => setReviewFilters({ ...reviewFilters, rating: e.target.value })}
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-xs font-bold"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <Input
                type="text"
                placeholder="Search products..."
                value={reviewFilters.productSearch}
                onChange={(e) => setReviewFilters({ ...reviewFilters, productSearch: e.target.value })}
                className="h-9 text-xs w-48 bg-white"
              />
            </div>

            <Button onClick={loadReviews} variant="outline" size="sm" className="font-bold gap-1">
              Filter / Refresh
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Review Preview</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No matching customer reviews found.
                    </td>
                  </tr>
                ) : (
                  reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{r.customerName}</div>
                        {r.verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">
                            <BadgeCheck className="w-3 h-3" /> Verified Order
                          </span>
                        )}
                        {r.orderId && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            ID: {r.orderId}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-bold text-gray-700">{r.productName}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-0.5 text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" /> {r.rating}
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="font-bold text-gray-900 truncate">{r.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{r.body}</div>
                        {r.adminReply && (
                          <div className="mt-1.5 p-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] text-gray-600">
                            <strong className="text-gray-800">Reply:</strong> {r.adminReply}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            r.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : r.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-y-1">
                        <div className="flex justify-end gap-1.5">
                          {r.status !== "approved" && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => updateReviewStatus(r.id, "approved")}
                              className="text-xs font-bold px-2 py-1 text-green-700 hover:bg-green-50"
                            >
                              Approve
                            </Button>
                          )}
                          {r.status !== "rejected" && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => updateReviewStatus(r.id, "rejected")}
                              className="text-xs font-bold px-2 py-1 text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              setReplyDialog({ open: true, review: r, text: r.adminReply || "" })
                            }
                            className="text-xs font-bold px-2 py-1"
                          >
                            Reply
                          </Button>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          {r.status !== "hidden" ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => updateReviewStatus(r.id, "hidden")}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700"
                            >
                              Hide
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => updateReviewStatus(r.id, "approved")}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700"
                            >
                              Restore
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteReviewConfirm(r.id)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Customer Counter */}
      {!loading && subTab === "counter" && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-medium">
            ⚠️ <strong>Verification Notice:</strong> The baseline count must reflect genuine users. Do not artificially inflate this number as audit trail updates are tracked natively.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-md font-heading font-bold text-foreground">Configure Counter</h3>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Current Baseline
                </label>
                <Input
                  type="number"
                  value={counterBaseline}
                  onChange={(e) => setCounterBaseline(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Count Mode
                </label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer select-none">
                    <input
                      type="radio"
                      name="countMode"
                      value="Unique Customers Served"
                      checked={counterMode === "Unique Customers Served"}
                      onChange={() => setCounterMode("Unique Customers Served")}
                      className="w-4 h-4 text-primary accent-primary"
                    />
                    Unique Customers Served
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer select-none">
                    <input
                      type="radio"
                      name="countMode"
                      value="Successful Orders Completed"
                      checked={counterMode === "Successful Orders Completed"}
                      onChange={() => setCounterMode("Successful Orders Completed")}
                      className="w-4 h-4 text-primary accent-primary"
                    />
                    Successful Orders Completed
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Reason for Change
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Migration from old SEO tools instance"
                  value={counterReason}
                  onChange={(e) => setCounterReason(e.target.value)}
                />
              </div>

              <Button onClick={saveCounter} className="w-full font-bold gap-2">
                <Save className="w-4 h-4" /> Save Baseline Settings
              </Button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-md font-heading font-bold text-foreground">Live Stats Preview</h3>

              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Configured Baseline:</span>
                  <span className="font-bold text-gray-800">{counterBaseline}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">New Verified Transactions:</span>
                  <span className="font-bold text-blue-600">+{newVerifiedCustomers}</span>
                </div>
                <div className="border-t border-gray-200 my-2 pt-2 flex justify-between items-center text-base">
                  <span className="font-bold text-gray-700">Display Total:</span>
                  <span className="font-black text-primary text-xl">
                    {counterBaseline + newVerifiedCustomers}
                  </span>
                </div>
                {lastUpdated && (
                  <div className="text-[10px] text-gray-400 text-right mt-1">
                    Last Updated: {new Date(lastUpdated).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Change Log Audit Trail
                </p>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-50">
                  {auditHistory.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No baseline changes recorded.</p>
                  ) : (
                    auditHistory.map((log: any) => (
                      <div key={log.id} className="pt-2 text-xs">
                        <div className="flex justify-between font-bold text-gray-700">
                          <span>
                            {log.oldValue} ➔ {log.newValue}
                          </span>
                          <span className="text-gray-400 font-normal">
                            {new Date(log.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-0.5">{log.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: Payment Methods */}
      {!loading && subTab === "payments" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 max-w-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-heading font-bold text-foreground">Payment Options</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Only add payment methods that are genuinely available at checkout.
              </p>
            </div>
            <Button
              onClick={() => setPaymentDialog({ open: true, name: "", enabled: true })}
              className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5"
            >
              <Plus className="w-4.5 h-4.5" /> Add Payment
            </Button>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
            {paymentMethods.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No payment options configured yet.
              </div>
            ) : (
              paymentMethods.map((m, idx) => (
                <div key={m.id} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-gray-400">#{m.sortOrder}</span>
                    <span className="font-bold text-gray-800">{m.name}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => movePayment(idx, "up")}
                        className="w-8 h-8"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={idx === paymentMethods.length - 1}
                        onClick={() => movePayment(idx, "down")}
                        className="w-8 h-8"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Enabled</span>
                      <Switch
                        checked={m.enabled}
                        onCheckedChange={() => togglePaymentEnabled(m)}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePaymentMethod(m.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {paymentMethods.length > 0 && (
            <Button onClick={savePaymentOrder} className="w-full font-bold gap-1.5">
              <Save className="w-4.5 h-4.5" /> Save Reordering
            </Button>
          )}
        </div>
      )}

      {/* SUB-TAB 7: Screenshots */}
      {!loading && subTab === "screenshots" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-medium flex gap-3">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold">Privacy Reminder</p>
              <p className="text-amber-700 mt-0.5">
                Before publishing any screenshot, ensure all customer names, email addresses, phone numbers, order numbers, payment details, passwords, and access credentials are removed or blurred.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-bold text-foreground">Access Screenshots</h3>
            <Button
              onClick={() =>
                setScreenshotDialog({
                  open: true,
                  mode: "add",
                  data: {
                    stepNumber: screenshots.length + 1,
                    caption: "",
                    altText: "",
                    imageUrl: "",
                    isPublished: true,
                    sortOrder: screenshots.length + 1,
                  },
                })
              }
              className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5"
            >
              <Plus className="w-4.5 h-4.5" /> Add Screenshot
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {screenshots.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl text-sm">
                No screenshots added yet. Document step-by-step credentials or guide tutorials!
              </div>
            ) : (
              screenshots.map((s, idx) => (
                <div
                  key={s.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-4"
                >
                  <div className="w-24 h-24 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {s.imageUrl ? (
                      <img
                        src={s.imageUrl}
                        alt={s.altText || "Screenshot"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No Image</span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-lg">
                          Step {s.stepNumber}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => moveScreenshot(idx, "up")}
                            className="w-7 h-7"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={idx === screenshots.length - 1}
                            onClick={() => moveScreenshot(idx, "down")}
                            className="w-7 h-7"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="font-bold text-gray-800 text-sm mt-1 truncate">{s.caption}</p>
                      <p className="text-gray-400 text-xs truncate mt-0.5">{s.imageUrl}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Published</span>
                        <Switch
                          checked={s.isPublished}
                          onCheckedChange={() => toggleScreenshotPublished(s)}
                        />
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setScreenshotDialog({ open: true, mode: "edit", data: s })}
                          className="text-primary text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteScreenshotConfirm(s.id)}
                          className="text-red-500 hover:text-red-600 text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {screenshots.length > 0 && (
            <Button onClick={saveScreenshotOrder} className="w-full font-bold gap-1.5">
              <Save className="w-4.5 h-4.5" /> Save Screenshots Order
            </Button>
          )}
        </div>
      )}

      {/* --- ADD / EDIT TESTIMONIAL DIALOG --- */}
      <Dialog
        open={testimonialDialog.open}
        onOpenChange={(isOpen) => !isOpen && setTestimonialDialog({ ...testimonialDialog, open: false })}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {testimonialDialog.mode === "add" ? "Add Testimonial" : "Edit Testimonial"}
            </DialogTitle>
            <DialogDescription>
              Input verified customer testimonials. Highlight endorsements to build checkout trust.
            </DialogDescription>
          </DialogHeader>

          {testimonialDialog.data && (
            <form onSubmit={saveTestimonial} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Display Name *
                </label>
                <Input
                  type="text"
                  required
                  value={testimonialDialog.data.displayName}
                  onChange={(e) =>
                    setTestimonialDialog({
                      ...testimonialDialog,
                      data: { ...testimonialDialog.data, displayName: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                    Job Title
                  </label>
                  <Input
                    type="text"
                    value={testimonialDialog.data.jobTitle || ""}
                    onChange={(e) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, jobTitle: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                    Company
                  </label>
                  <Input
                    type="text"
                    value={testimonialDialog.data.company || ""}
                    onChange={(e) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, company: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Photo URL
                </label>
                <Input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={testimonialDialog.data.photoUrl || ""}
                  onChange={(e) =>
                    setTestimonialDialog({
                      ...testimonialDialog,
                      data: { ...testimonialDialog.data, photoUrl: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Testimonial text *
                </label>
                <Textarea
                  required
                  rows={3}
                  value={testimonialDialog.data.testimonialText}
                  onChange={(e) =>
                    setTestimonialDialog({
                      ...testimonialDialog,
                      data: { ...testimonialDialog.data, testimonialText: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                    Rating (1-5)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={testimonialDialog.data.rating}
                    onChange={(e) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, rating: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={testimonialDialog.data.sortOrder}
                    onChange={(e) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, sortOrder: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block">Is Sample</span>
                    <span className="text-xs text-rose-500 block">Warning: Sample testimonials will be labeled as such.</span>
                  </div>
                  <Switch
                    checked={testimonialDialog.data.isSample}
                    onCheckedChange={(checked) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, isSample: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block">Is Published</span>
                  </div>
                  <Switch
                    checked={testimonialDialog.data.isPublished}
                    onCheckedChange={(checked) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, isPublished: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block">Permission Obtained</span>
                    <span className="text-xs text-gray-500 block">Only publish with customer permission.</span>
                  </div>
                  <Switch
                    checked={testimonialDialog.data.permissionObtained}
                    onCheckedChange={(checked) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, permissionObtained: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block">Is Verified</span>
                    <span className="text-xs text-gray-500 block">Only mark verified when connected to a real order.</span>
                  </div>
                  <Switch
                    disabled={!testimonialDialog.data.verifiedOrderId}
                    checked={testimonialDialog.data.isVerified}
                    onCheckedChange={(checked) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: { ...testimonialDialog.data, isVerified: checked },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                    Verified Order ID (Enables verification badge)
                  </label>
                  <Input
                    type="text"
                    placeholder="order_12345"
                    value={testimonialDialog.data.verifiedOrderId || ""}
                    onChange={(e) =>
                      setTestimonialDialog({
                        ...testimonialDialog,
                        data: {
                          ...testimonialDialog.data,
                          verifiedOrderId: e.target.value,
                          isVerified: e.target.value ? testimonialDialog.data.isVerified : false,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="font-bold">
                  Save Testimonial
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- ADD / EDIT SCREENSHOT DIALOG --- */}
      <Dialog
        open={screenshotDialog.open}
        onOpenChange={(isOpen) => !isOpen && setScreenshotDialog({ ...screenshotDialog, open: false })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {screenshotDialog.mode === "add" ? "Add Screenshot" : "Edit Screenshot"}
            </DialogTitle>
            <DialogDescription>
              Upload or link interface images demonstrating tool accessibility.
            </DialogDescription>
          </DialogHeader>

          {screenshotDialog.data && (
            <form onSubmit={saveScreenshot} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                    Step Number
                  </label>
                  <Input
                    type="number"
                    value={screenshotDialog.data.stepNumber}
                    onChange={(e) =>
                      setScreenshotDialog({
                        ...screenshotDialog,
                        data: { ...screenshotDialog.data, stepNumber: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={screenshotDialog.data.sortOrder || ""}
                    onChange={(e) =>
                      setScreenshotDialog({
                        ...screenshotDialog,
                        data: { ...screenshotDialog.data, sortOrder: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Caption
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Select your preferred search country"
                  value={screenshotDialog.data.caption}
                  onChange={(e) =>
                    setScreenshotDialog({
                      ...screenshotDialog,
                      data: { ...screenshotDialog.data, caption: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Alt Text
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Screenshot showing the country selection dropdown"
                  value={screenshotDialog.data.altText}
                  onChange={(e) =>
                    setScreenshotDialog({
                      ...screenshotDialog,
                      data: { ...screenshotDialog.data, altText: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Image URL
                </label>
                <Input
                  type="text"
                  placeholder="/images/screenshots/step1.png"
                  value={screenshotDialog.data.imageUrl}
                  onChange={(e) =>
                    setScreenshotDialog({
                      ...screenshotDialog,
                      data: { ...screenshotDialog.data, imageUrl: e.target.value },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-gray-700">Publish Immediately</p>
                  <p className="text-xs text-gray-500">Make this guide step visible to users</p>
                </div>
                <Switch
                  checked={screenshotDialog.data.isPublished}
                  onCheckedChange={(checked) =>
                    setScreenshotDialog({
                      ...screenshotDialog,
                      data: { ...screenshotDialog.data, isPublished: checked },
                    })
                  }
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="font-bold">
                  Save Screenshot Step
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- ADD PAYMENT METHOD DIALOG --- */}
      <Dialog
        open={paymentDialog.open}
        onOpenChange={(isOpen) => !isOpen && setPaymentDialog({ ...paymentDialog, open: false })}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Introduce genuine checkout options available for customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Payment Option Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Paystack, Stripe, Direct Bank Transfer"
                value={paymentDialog.name}
                onChange={(e) => setPaymentDialog({ ...paymentDialog, name: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-700">Enabled</p>
                <p className="text-xs text-gray-500">Show immediately at checkout options info</p>
              </div>
              <Switch
                checked={paymentDialog.enabled}
                onCheckedChange={(checked) => setPaymentDialog({ ...paymentDialog, enabled: checked })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={addPaymentMethod} className="w-full font-bold">
                Create Payment Option
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- ADD / EDIT REVIEW REPLY DIALOG --- */}
      <Dialog
        open={replyDialog.open}
        onOpenChange={(isOpen) => !isOpen && setReplyDialog({ ...replyDialog, open: false })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Official Reply</DialogTitle>
            <DialogDescription>
              Post a public support reply addressing this customer review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {replyDialog.review && (
              <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <p className="font-bold text-gray-700">
                  {replyDialog.review.customerName} ({replyDialog.review.rating} Stars)
                </p>
                <p className="italic text-gray-600">"{replyDialog.review.body}"</p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">
                Your Response
              </label>
              <Textarea
                placeholder="Thank you for the feedback! We have resolved the access issue..."
                value={replyDialog.text}
                onChange={(e) => setReplyDialog({ ...replyDialog, text: e.target.value })}
                rows={4}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={saveReply} className="w-full font-bold">
                Submit Response
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- CONFIRMATION ALERTS --- */}
      <AlertDialog
        open={!!deleteTestimonialConfirm}
        onOpenChange={(isOpen) => !isOpen && setDeleteTestimonialConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This testimonial will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTestimonialConfirm && deleteTestimonial(deleteTestimonialConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteScreenshotConfirm}
        onOpenChange={(isOpen) => !isOpen && setDeleteScreenshotConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete screenshot step?</AlertDialogTitle>
            <AlertDialogDescription>
              This step details will be permanently deleted from the access guides database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteScreenshotConfirm && deleteScreenshot(deleteScreenshotConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteReviewConfirm}
        onOpenChange={(isOpen) => !isOpen && setDeleteReviewConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this customer feedback?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteReviewConfirm && deleteReview(deleteReviewConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
