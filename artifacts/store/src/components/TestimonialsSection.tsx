import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Testimonial {
  id: number;
  displayName: string;
  jobTitle: string | null;
  company: string | null;
  testimonialText: string;
  rating: number | null;
  photoUrl: string | null;
  isPublished: boolean;
  createdAt: string;
}

export function TestimonialsSection() {
  const { data: testimonials, isLoading, error } = useQuery<Testimonial[], Error>({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const res = await fetch(`${BASE_PATH}/api/trust/testimonials`);
      if (!res.ok) {
        throw new Error(`Failed to fetch testimonials: ${res.statusText}`);
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 md:px-6 py-20 bg-transparent">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4 bg-gray-200" />
          <Skeleton className="h-4 w-96 mx-auto bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  // Gracefully return null on error or empty published testimonials
  if (error || !testimonials) {
    return null;
  }

  const published = testimonials.filter((t) => t.isPublished);
  if (published.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 md:px-6 py-20 bg-transparent">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-4 uppercase text-foreground">
          What Our <span className="text-primary">Customers Say</span>
        </h2>
        <p className="text-muted-foreground text-sm font-semibold uppercase tracking-widest max-w-2xl mx-auto">
          Real experiences from real customers
        </p>
        <div className="w-24 h-1.5 bg-accent mx-auto rounded-full mt-4"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {published.map((testimonial) => {
          const initials = testimonial.displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          const subDetails = [testimonial.jobTitle, testimonial.company]
            .filter(Boolean)
            .join(", ");

          return (
            <div
              key={testimonial.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300"
            >
              <div>
                {/* Rating stars if present */}
                {testimonial.rating !== null && testimonial.rating !== undefined && (
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (testimonial.rating || 0)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                )}

                <p className="text-gray-700 italic text-base leading-relaxed mb-6 font-medium">
                  &ldquo;{testimonial.testimonialText}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
                <Avatar className="w-11 h-11 border border-gray-100">
                  {testimonial.photoUrl ? (
                    <AvatarImage src={testimonial.photoUrl} alt={testimonial.displayName} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-white font-bold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h4 className="font-bold text-sm text-foreground">{testimonial.displayName}</h4>
                  {subDetails && (
                    <span className="text-xs text-muted-foreground font-semibold">{subDetails}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
