'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * QueryProvider - Wraps the app with React Query's QueryClientProvider
 * 
 * Configuration:
 * - staleTime: 5 minutes (data is fresh for 5 min)
 * - gcTime: 30 minutes (unused data kept in cache)
 * - refetchOnWindowFocus: true (refetch when tab regains focus)
 * - retry: 3 (retry failed requests 3 times)
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
                        refetchOnWindowFocus: true,
                        retry: 3,
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                    },
                    mutations: {
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
