import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface PaymentMethod {
  id: number;
  name: string;
  isEnabled: boolean;
}

export function PaymentMethodsSection() {
  const { data: methods, isLoading, error } = useQuery<PaymentMethod[], Error>({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const res = await fetch(`${BASE_PATH}/api/trust/payment-methods`);
      if (!res.ok) {
        throw new Error(`Failed to fetch payment methods: ${res.statusText}`);
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center gap-2 py-4">
        <Skeleton className="h-6 w-24 bg-gray-100" />
        <Skeleton className="h-6 w-24 bg-gray-100" />
        <Skeleton className="h-6 w-24 bg-gray-100" />
      </div>
    );
  }

  if (error || !methods) {
    return null;
  }

  const enabledMethods = methods.filter((m) => m.isEnabled);
  if (enabledMethods.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8 border-t border-gray-100 w-full">
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest">
        <Lock className="w-3.5 h-3.5 text-primary" />
        Secure Payment Methods
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {enabledMethods.map((method) => (
          <span
            key={method.id}
            aria-label={`Payment method ${method.name}`}
            className="bg-white border border-gray-200 rounded-md px-3.5 py-1.5 text-xs font-bold text-gray-700 shadow-sm hover:border-primary/30 hover:text-primary transition-colors cursor-default"
          >
            {method.name}
          </span>
        ))}
      </div>
    </div>
  );
}
