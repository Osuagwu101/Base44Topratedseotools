import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Review {
  id: number;
  productId: number;
  orderId: number | null;
  rating: number;
  title: string | null;
  body: string;
  customerName: string | null;
  isVerifiedPurchase: boolean;
  adminReply: string | null;
  status: string;
  submittedAt: string;
}

export interface ReviewSummary {
  productId: number;
  avgRating: number;
  totalCount: number;
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface ReviewsSectionProps {
  productId: number;
}

export function ReviewsSection({ productId }: ReviewsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(5);

  const { data: reviews, isLoading: isReviewsLoading, error: reviewsError } = useQuery<Review[], Error>({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const res = await fetch(`${BASE_PATH}/api/trust/reviews/${productId}?limit=50`);
      if (!res.ok) {
        throw new Error(`Failed to fetch reviews: ${res.statusText}`);
      }
      const data = await res.json();
      // API returns {reviews: [], pagination: {}} 
      return Array.isArray(data) ? data : (data.reviews ?? []);
    },
  });

  const { data: summary, isLoading: isSummaryLoading, error: summaryError } = useQuery<ReviewSummary, Error>({
    queryKey: ["reviews-summary", productId],
    queryFn: async () => {
      const res = await fetch(`${BASE_PATH}/api/trust/reviews/${productId}/summary`);
      if (!res.ok) {
        throw new Error(`Failed to fetch review summary: ${res.statusText}`);
      }
      return res.json();
    },
  });

  if (isReviewsLoading || isSummaryLoading) {
    return (
      <div className="space-y-8 mt-12 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        <Skeleton className="h-8 w-48 bg-gray-100" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-32 bg-gray-100 rounded-xl" />
          <Skeleton className="h-32 bg-gray-100 rounded-xl md:col-span-2" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Gracefully return null on error
  if (reviewsError || summaryError) {
    return null;
  }

  const approvedReviews = (reviews || []).filter((r) => r.status === 'approved');
  const totalReviews = approvedReviews.length;

  return (
    <div className="space-y-12 mt-16 bg-white rounded-3xl border border-gray-100 p-8 md:p-12 shadow-sm">
      <h3 className="font-heading text-2xl uppercase border-b border-border pb-4">Customer Reviews</h3>

      {totalReviews === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-semibold text-lg">No reviews yet. Be the first to review this product.</p>
        </div>
      ) : (
        <>
          {/* Summary Block */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-gray-50 items-center">
              <div className="text-center md:border-r border-gray-100 md:pr-8 py-4">
                <div className="text-5xl font-heading font-black text-primary mb-2">
                  {summary.avgRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(summary.avgRating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  {summary.totalCount} {summary.totalCount === 1 ? "Review" : "Reviews"}
                </div>
              </div>

              <div className="md:col-span-2 space-y-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = summary.breakdown[stars as keyof typeof summary.breakdown] || 0;
                  const percentage = summary.totalCount > 0 ? (count / summary.totalCount) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-sm">
                      <span className="w-12 font-bold text-gray-600 flex items-center gap-1">
                        {stars} <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 inline" />
                      </span>
                      <Progress value={percentage} className="h-2 bg-gray-100" />
                      <span className="w-10 text-right text-muted-foreground font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List of Approved Reviews */}
          <div className="space-y-6">
            {approvedReviews.slice(0, visibleCount).map((review) => (
              <div key={review.id} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">
                      {review.customerName || "Anonymous"}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 bg-[#E8FFF3] text-[#24A45A] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#24A45A]/10">
                        <CheckCircle className="w-3.5 h-3.5 fill-current text-white" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {new Date(review.submittedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                      }`}
                    />
                  ))}
                  {review.title && (
                    <span className="ml-2 font-bold text-foreground text-sm">{review.title}</span>
                  )}
                </div>

                <p className="text-gray-600 text-sm leading-relaxed mb-4 whitespace-pre-line font-medium">
                  {review.body}
                </p>

                {/* Admin Reply Block */}
                {review.adminReply && (
                  <div className="bg-[#F7F8F9] rounded-xl border border-gray-100 p-4 mt-3 ml-4">
                    <h4 className="font-bold text-xs text-primary uppercase tracking-wider mb-1.5">
                      Response from Top Rated SEO Tools
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                      {review.adminReply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {approvedReviews.length > visibleCount && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                className="font-bold border-2 rounded-xl h-12 px-8 uppercase tracking-wider text-sm hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all"
                onClick={() => setVisibleCount((prev) => prev + 5)}
              >
                Load More Reviews
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
