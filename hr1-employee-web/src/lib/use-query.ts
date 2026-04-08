import useSWR, { SWRConfiguration } from "swr";

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
