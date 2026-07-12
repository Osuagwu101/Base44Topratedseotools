import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AccessScreenshot {
  id: number;
  stepNumber: number;
  imageUrl: string;
  caption: string | null;
  isPublished: boolean;
  createdAt: string;
}

export function AccessScreenshotsSection() {
  const { data: screenshots, isLoading, error } = useQuery<AccessScreenshot[], Error>({
    queryKey: ["access-screenshots"],
    queryFn: async () => {
      const res = await fetch(`${BASE_PATH}/api/trust/screenshots`);
      if (!res.ok) {
        throw new Error(`Failed to fetch screenshots: ${res.statusText}`);
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 md:px-6 py-20 bg-transparent">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4 bg-gray-100" />
          <Skeleton className="h-4 w-96 mx-auto bg-gray-100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (error || !screenshots) {
    return null;
  }

  const published = screenshots
    .filter((s) => s.isPublished)
    .sort((a, b) => a.stepNumber - b.stepNumber);

  if (published.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 md:px-6 py-20 bg-transparent">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-4 uppercase text-foreground">
          How You <span className="text-primary">Receive Access</span>
        </h2>
        <div className="w-24 h-1.5 bg-accent mx-auto rounded-full mt-4"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {published.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow"
          >
            <div className="relative mb-5 rounded-xl overflow-hidden border border-gray-100 bg-[#F7F8F9] flex items-center justify-center min-h-[180px]">
              <img
                src={item.imageUrl}
                alt={item.caption || `Step ${item.stepNumber} Delivery`}
                className="max-h-60 w-auto object-contain p-2"
              />
              <span className="absolute top-3 left-3 flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white font-heading font-extrabold text-sm shadow-md">
                {item.stepNumber}
              </span>
            </div>
            {item.caption && (
              <p className="text-gray-600 font-semibold text-center text-sm leading-relaxed mt-auto px-2">
                {item.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
