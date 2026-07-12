import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export function CustomersCounter() {
  const [count, setCount] = useState(0);

  const { data, isLoading, error } = useQuery<{ displayed: number }, Error>({
    queryKey: ["customers-count"],
    queryFn: async () => {
      const res = await fetch(`${BASE_PATH}/api/trust/customers-count`);
      if (!res.ok) {
        throw new Error(`Failed to fetch customers count: ${res.statusText}`);
      }
      return res.json();
    },
  });

  const targetValue = data?.displayed ?? 0;

  useEffect(() => {
    if (targetValue <= 0) return;

    setCount(0);

    const duration = 1200; // Animate over 1.2 seconds
    const intervalTime = 30; // Update every 30ms
    const totalSteps = duration / intervalTime;
    const increment = Math.ceil(targetValue / totalSteps);

    const timer = setInterval(() => {
      setCount((prev) => {
        const next = prev + increment;
        if (next >= targetValue) {
          clearInterval(timer);
          return targetValue;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [targetValue]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-sm mx-auto text-center">
        <Skeleton className="h-10 w-24 mx-auto mb-2 bg-gray-100" />
        <Skeleton className="h-4 w-32 mx-auto bg-gray-100" />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-sm mx-auto text-center hover:shadow-md transition-shadow">
      <div className="text-4xl md:text-5xl font-heading font-black text-primary mb-2">
        {count.toLocaleString()}
      </div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
        Customers Served
      </div>
    </div>
  );
}
