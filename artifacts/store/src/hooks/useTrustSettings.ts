import { useQuery } from "@tanstack/react-query";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface TrustSettings {
  whatsappEnabled: boolean;
  whatsappNumber: string | null;
  whatsappMessage: string | null;
  emailEnabled: boolean;
  businessEmail: string | null;  // Fixed: API returns businessEmail not emailAddress
  emailOpenApp: boolean;
}

const DEFAULT_SETTINGS: TrustSettings = {
  whatsappEnabled: false,
  whatsappNumber: null,
  whatsappMessage: null,
  emailEnabled: false,
  businessEmail: null,
  emailOpenApp: false,
};

export function useTrustSettings() {
  const { data, isLoading, error } = useQuery<Record<string, string>, Error>({
    queryKey: ["trustSettings"],
    queryFn: async () => {
      const res = await fetch(`${BASE_PATH}/api/trust/settings`);
      if (!res.ok) throw new Error(`Failed to fetch trust settings: ${res.statusText}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Normalize the key-value string map the API returns into typed booleans
  const normalized: TrustSettings = data
    ? {
        whatsappEnabled: data["whatsappEnabled"] === "true",
        whatsappNumber: data["whatsappNumber"] ?? null,
        whatsappMessage: data["whatsappMessage"] ?? null,
        emailEnabled: data["emailEnabled"] === "true",
        businessEmail: data["businessEmail"] ?? null,
        emailOpenApp: data["emailOpenApp"] !== "false", // default true
      }
    : DEFAULT_SETTINGS;

  return {
    data: normalized,
    isLoading,
    error,
  };
}
