import useSWR, { SWRConfiguration } from "swr";

/**
 * SWR wrapper for Supabase queries.
 * - Caches results by key, avoiding refetch on page navigation
 * - dedupingInterval: 10s to prevent duplicate requests
 */
export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  config?: SWRConfiguration<T>
) {
  return useSWR<T>(key, fetcher, {
    dedupingInterval: 10_000,
    revalidateOnFocus: false,
    onError: (err) => {
      console.error(`[useQuery] ${key}:`, err);
    },
    ...config,
  });
}
