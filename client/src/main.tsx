import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { TourOverlay } from "@/components/TourOverlay";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache data for 30 minutes before garbage collection
      gcTime: 1000 * 60 * 30,
      // Retry logic: don't retry on 4xx errors, retry up to 3 times for others
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx)
        if (error instanceof TRPCClientError) {
          const httpStatus = error.data?.httpStatus;
          if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      // Don't refetch on window focus to reduce unnecessary requests
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Don't retry mutations by default
      retry: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <OnboardingProvider>
        <App />
        <TourOverlay />
      </OnboardingProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
