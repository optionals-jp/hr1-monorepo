import useSWR, { SWRConfiguration } from "swr";

/**
 * SWR wrapper for Supabase queries.
 * - Caches results by key, avoiding refetch on page navigation
 * - Revalidates in background on window focus (default SWR behavior)
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
    ...config,
  });
}
