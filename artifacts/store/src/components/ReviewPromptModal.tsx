import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface ReviewPrompt {
  id: number;
  productId: number;
  productName: string;
  orderId: number;
  userId: string;
  isDismissed: boolean;
  seenCount: number;
  createdAt: string;
}

export function ReviewPromptModal() {
  const { isSignedIn } = useAuth();
  const [prompts, setPrompts] = useState<ReviewPrompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    // Only once per login session
    const shown = sessionStorage.getItem("reviewPromptShown");
    if (shown === "true") return;

    const fetchPrompts = async () => {
      try {
        const res = await fetch(`${BASE_PATH}/api/trust/review-prompts`);
        if (res.ok) {
          const data = (await res.json()) as ReviewPrompt[];
          // Only show un-dismissed prompts
          const activePrompts = data.filter((p) => !p.isDismissed);
          if (activePrompts.length > 0) {
            setPrompts(activePrompts);
            setCurrentIndex(0);
            // Delay showing the modal by 2 seconds
            setTimeout(() => {
              setIsOpen(true);
              sessionStorage.setItem("reviewPromptShown", "true");
            }, 2000);
          }
        }
      } catch (err) {
        console.error("Failed to fetch review prompts", err);
      }
    };

    fetchPrompts();
  }, [isSignedIn]);

  const currentPrompt = prompts[currentIndex];

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleNext = () => {
    // Reset form states
    setRating(0);
    setTitle("");
    setBody("");

    if (currentIndex + 1 < prompts.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPrompt || rating === 0 || !body.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/trust/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: currentPrompt.productId,
          orderId: currentPrompt.orderId,
          rating,
          title: title.trim() || null,
          body: body.trim(),
        }),
      });

      if (res.ok) {
        handleNext();
      }
    } catch (err) {
      console.error("Failed to submit review", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!currentPrompt) return;
    try {
      await fetch(
        `${BASE_PATH}/api/trust/review-prompts/${currentPrompt.orderId}/${currentPrompt.productId}/dismiss`,
        { method: "POST" }
      );
      handleNext();
    } catch (err) {
      console.error("Failed to dismiss review prompt", err);
    }
  };

  const handleReviewLater = async () => {
    if (!currentPrompt) return;
    try {
      await fetch(
        `${BASE_PATH}/api/trust/review-prompts/${currentPrompt.orderId}/${currentPrompt.productId}/seen`,
        { method: "POST" }
      );
      handleNext();
    } catch (err) {
      console.error("Failed to mark review prompt as seen", err);
    }
  };

  if (!isOpen || !currentPrompt) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleReviewLater(); }}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl border border-gray-100 shadow-xl p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-heading font-bold text-foreground text-center">
            Review Your Purchase
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-muted-foreground text-center">
            How was your experience with <span className="text-primary">{currentPrompt.productName}</span>?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Star selector */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                key={stars}
                type="button"
                onClick={() => handleRatingClick(stars)}
                className="hover:scale-110 transition-transform focus:outline-none"
              >
                <Star
                  className={`w-9 h-9 ${
                    stars <= rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-200 hover:text-yellow-200"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="title" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Title (Optional)
              </label>
              <Input
                id="title"
                placeholder="Summarize your experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border border-gray-200 focus:border-primary focus:ring-primary h-10"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="body" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Review (Required)
              </label>
              <Textarea
                id="body"
                required
                placeholder="Tell us what you liked or disliked"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="rounded-xl border border-gray-200 focus:border-primary focus:ring-primary min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              className="font-bold text-red-500 hover:text-red-600 hover:bg-red-50 text-xs uppercase tracking-wider h-11 rounded-xl"
            >
              Dismiss
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReviewLater}
              className="font-bold border-2 text-xs uppercase tracking-wider h-11 rounded-xl"
            >
              Review Later
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating === 0 || !body.trim()}
              className="font-bold bg-primary hover:bg-primary/90 text-white text-xs uppercase tracking-wider h-11 rounded-xl px-6 flex-1 shadow-sm"
            >
              Submit Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
