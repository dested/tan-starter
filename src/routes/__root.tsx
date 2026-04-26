/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth, type Session } from '~/lib/auth'
import { TRPCReactProvider } from '~/trpc/react'
import appCss from '~/styles/app.css?url'

interface RouterContext {
  session: Session | null
}

const fetchSession = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  return await auth.api.getSession({ headers: request.headers })
})

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => ({ session: await fetchSession() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Tan Starter' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <TRPCReactProvider>
        <Outlet />
      </TRPCReactProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  const { session } = Route.useRouteContext()
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="border-b">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
            <Link to="/" className="font-semibold">
              tan-starter
            </Link>
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
              activeProps={{ className: 'text-foreground' }}
            >
              Dashboard
            </Link>
            <div className="ml-auto flex items-center gap-3 text-sm">
              {session ? (
                <>
                  <span className="text-muted-foreground">{session.user.email}</span>
                  <a href="/api/auth/sign-out" className="hover:underline">
                    Sign out
                  </a>
                </>
              ) : (
                <>
                  <Link to="/sign-in" className="hover:underline">
                    Sign in
                  </Link>
                  <Link to="/sign-up" className="hover:underline">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
