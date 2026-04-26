import type { ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import type { TRPCClient } from '@trpc/client'
import type { AppRouter } from './router'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export function TRPCReactProvider({
  children,
  queryClient,
  trpcClient,
}: {
  children: ReactNode
  queryClient: QueryClient
  trpcClient: TRPCClient<AppRouter>
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
