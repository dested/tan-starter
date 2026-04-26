import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    context: { session: null },
    defaultPreload: 'intent',
    defaultErrorComponent: ({ error }) => (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <pre className="mt-2 text-sm opacity-70">{error.message}</pre>
      </div>
    ),
    defaultNotFoundComponent: () => (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Not found</h1>
      </div>
    ),
    scrollRestoration: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
