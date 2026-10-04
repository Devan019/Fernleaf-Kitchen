"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // 1 minute fresh window to prevent duplicate queries on re-navigation
            gcTime: 5 * 60 * 1000, // 5 minutes cache retention
            refetchOnWindowFocus: false, // Prevent aggressive refetching when switching browser tabs
            retry: (failureCount, error) => {
              // Do not retry on 401 / 403
              if (
                error instanceof Error &&
                "statusCode" in error &&
                typeof (error as { statusCode: number }).statusCode === "number"
              ) {
                const code = (error as { statusCode: number }).statusCode;
                if (code === 401 || code === 403) return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
