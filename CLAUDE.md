# CLAUDE.md

Briefing for an LLM extending this codebase. Read this before changing files.

## What this is

A starter template (cloned, then mutated into a real product). Every file is intentionally minimal — keep it that way. When asked to add a feature, add the feature; do not also "improve" surrounding files.

## Stack

| layer | choice | notes |
| --- | --- | --- |
| runtime / pkg mgr | Bun ≥ 1.3 | both dev and prod |
| framework | TanStack Start (Vite SSR) | file-based routing via TanStack Router |
| db | Postgres + Drizzle ORM | postgres-js driver |
| auth | better-auth | email + password only, autoSignIn on sign-up |
| api | tRPC v11 | uses `@trpc/tanstack-react-query` (`.queryOptions()` API) |
| styles | Tailwind v4 + shadcn (new-york) | CSS-first config, oklch tokens |
| deploy | Render.com blueprint | `runtime: node` + `BUN_VERSION` env var |

## Layout (load this mental model)

```
src/
├── db/          schema.ts (auth tables + post demo) + index.ts (drizzle client)
├── lib/         auth.ts (server), auth-client.ts (browser), env.ts, utils.ts
├── trpc/        init.ts (procedures), router.ts (appRouter), react.tsx (provider)
├── routes/
│   ├── __root.tsx       layout, navbar, fetches session into router context
│   ├── index.tsx        public landing
│   ├── sign-in.tsx      authClient.signIn.email + redirect
│   ├── sign-up.tsx      authClient.signUp.email + redirect
│   ├── dashboard.tsx    protected (beforeLoad redirect), uses tRPC
│   └── api/
│       ├── auth/$.ts    splat → auth.handler(request)
│       └── trpc/$.ts    splat → fetchRequestHandler
├── components/ui/       shadcn primitives (Button, Input, Label, Card)
├── styles/app.css       Tailwind v4 import + shadcn tokens
├── router.tsx           createRouter (registers context: { session })
└── routeTree.gen.ts     AUTO-GENERATED. Do not hand-edit.
```

Top-level: `vite.config.ts`, `drizzle.config.ts`, `components.json`, `server.ts` (Bun prod server), `render.yaml`.

## Hard rules

1. **Path alias is `~/*` → `src/*`.** Use it. Defined in both `tsconfig.json` and `vite.config.ts` (`resolve.alias`). If you add a top-level dir, mirror the alias in both places.

2. **Server-only modules: `~/lib/auth`, `~/lib/env`, `~/db/*`, `~/trpc/init`, `~/trpc/router`.** These import secrets, postgres-js, or Node-only deps. **Never import them from a client component or a `.tsx` route's render path.** Routes can use them inside `createServerFn` handlers, route `server.handlers`, or `beforeLoad` (which runs on the server during SSR). Importing them client-side will either leak secrets or fail to bundle.

3. **`src/routeTree.gen.ts` regenerates on every `vite dev` / `vite build`.** It is gitignored. Do not commit it; do not hand-edit it. It will be overwritten.

4. **File-based routing conventions** (TanStack Router, not Next/Remix):
   - `__root.tsx` — root layout
   - `_authed.tsx` — pathless layout group (we don't use this yet, but if you add it, all children inherit its `beforeLoad`)
   - `$param.tsx` — single dynamic segment
   - `$.ts` / `$.tsx` — splat / catch-all (used for `routes/api/auth/$.ts` and `routes/api/trpc/$.ts`)
   - `index.tsx` — index of a folder (`routes/posts/index.tsx` → `/posts`)
   - `posts.$postId.tsx` — flat-route syntax for `/posts/:postId`

5. **Server routes are file routes with a `server` field.** Export pattern:
   ```ts
   export const Route = createFileRoute('/api/foo')({
     server: { handlers: { GET: ({ request }) => Response.json(...) } },
   })
   ```
   Do not invent a separate API mounting scheme.

6. **Env vars are zod-validated at import time** (`src/lib/env.ts`). Any new required env var must be added there AND to `.env.example` AND to `render.yaml`. If `env.ts` throws, the server won't start — that's the design.

7. **better-auth's required schema lives in `src/db/schema.ts`** (`user`, `session`, `account`, `verification`). Do not rename columns or change types unless you also update `src/lib/auth.ts`'s `drizzleAdapter` schema map. The shape matches better-auth's documented requirements; if you upgrade better-auth, re-verify against its docs.

8. **shadcn components do NOT have `asChild` support here.** I dropped `@radix-ui/react-slot` to keep deps minimal. If you `bunx shadcn add` something that needs Slot, install `@radix-ui/react-slot` first.

## Architecture flows

### Auth (browser → cookie → session)

1. User submits the sign-in form → `authClient.signIn.email({ email, password })` (browser).
2. better-auth client POSTs to `/api/auth/sign-in/email` → caught by `routes/api/auth/$.ts` → `auth.handler(request)` validates and sets a session cookie.
3. Form handler calls `router.invalidate()` then `router.navigate({ to: '/dashboard' })`.
4. Invalidate re-runs `__root.tsx`'s `beforeLoad`, which calls a `createServerFn` that does `auth.api.getSession({ headers: request.headers })`. Result lands in router context as `{ session }`.
5. Any route — including loaders and components — reads it via `Route.useRouteContext().session`.

### tRPC

1. Client component calls `useTRPC().posts.list.queryOptions()` and passes it to `useQuery`.
2. Request hits `/api/trpc/posts.list` → `routes/api/trpc/$.ts` → `fetchRequestHandler({ endpoint: '/api/trpc', router: appRouter, createContext })`.
3. `createContext` (in `src/trpc/init.ts`) calls `auth.api.getSession({ headers: req.headers })` and attaches it to `ctx`.
4. `protectedProcedure` throws `UNAUTHORIZED` if `ctx.session` is null. `publicProcedure` doesn't check.

## Common tasks

### Add a route

Create `src/routes/<name>.tsx` exporting `Route = createFileRoute('/<name>')({...})`. The router plugin picks it up on next dev/build. For nested or dynamic routes use the conventions in rule 4 above.

### Add a tRPC procedure

In `src/trpc/router.ts`, add to the `appRouter` tree. Choose `publicProcedure` or `protectedProcedure`. Validate inputs with zod. Return data — don't `Response.json` (tRPC handles serialization). Type flows automatically to the client via `AppRouter` type export.

### Add a DB table

1. Edit `src/db/schema.ts` (use existing `pgTable` patterns; FK references to `user.id` should be `onDelete: 'cascade'` to match the rest of the schema).
2. `bun run db:push` — applies directly (dev). Or `bun run db:generate` to write a migration file under `./drizzle/` (prod-grade).
3. Use it in tRPC procedures: `db.select().from(myTable)`. Drizzle gives full inference from the schema.

### Add a shadcn component

```bash
bunx --bun shadcn@latest add <name>
```

It writes to `src/components/ui/`. Aliases in `components.json` already point at `~/components` and `~/lib/utils`.

### Add an env var

`src/lib/env.ts` (zod schema) → `.env.example` (placeholder) → `render.yaml` (envVars block, with `sync: false` for secrets the user supplies, or `generateValue: true` if Render should generate it).

## Build / verify

```
bun run typecheck   # tsc --noEmit
bun run build       # vite build → dist/server/server.js + dist/client/*
bun run dev         # http://localhost:3000
```

If you change anything touching tRPC/auth/Drizzle types, run `typecheck`. If you add a route, run `dev` once so `routeTree.gen.ts` regenerates before `typecheck`.

## Production server

`server.ts` (Bun) imports `./dist/server/server.js` (built artifact). The `// @ts-ignore` on that import is intentional — the file doesn't exist before first build. Don't change it to `@ts-expect-error`; that errors when the dist exists.

Static assets in `dist/client/` are served with `Cache-Control: public, max-age=31536000, immutable`. Everything else falls through to the TanStack Start handler.

## Render deploy gotchas

- `runtime: node`, NOT `runtime: bun`. Render's blueprint spec doesn't expose a bun runtime. Setting `BUN_VERSION` in `envVars` makes the node runtime install Bun and put it on PATH.
- `preDeployCommand: bunx drizzle-kit push --force` — applies schema directly. Fine for a starter; switch to `drizzle-kit migrate` against committed migrations for real production.
- `BETTER_AUTH_URL` must be set to the public Render URL after first deploy (`sync: false` in the blueprint, so Render won't overwrite it).
- The free Postgres plan expires after 30 days on Render — bump the plan when going past prototype.

## Versions to be aware of

- TanStack Router 1.168.x changed file-route generation; the `_addFileTypes<>()` form in `routeTree.gen.ts` is current. If you upgrade major and the gen file looks different, that's expected — let it regenerate.
- Tailwind v4 uses `@import 'tailwindcss'` (not `@tailwind base/components/utilities`). Theme tokens go in `@theme inline { ... }`. There is no `tailwind.config.ts`.
- Drizzle 0.36 syntax. `drizzle-kit` is on 0.28. Don't mix major versions.
- Vite 6. The `resolve.tsconfigPaths: true` shorthand from TanStack monorepo examples is canary-only — we use explicit `resolve.alias` instead.

## Don't

- Don't add `tailwind.config.{js,ts}` — Tailwind v4 doesn't use it; tokens are in `app.css`.
- Don't introduce a separate API server — server routes ARE the API.
- Don't add Next.js / Remix / SvelteKit assumptions. This is TanStack Router file-based routing; conventions differ.
- Don't reach for `@trpc/react-query` (the old package) — we use `@trpc/tanstack-react-query` (the new one with `queryOptions()` / `mutationOptions()`).
- Don't add SSR query hydration plumbing unless asked. Queries currently fetch client-side after hydration; the page shell is SSR. That's deliberate for "simple."
- Don't commit `.env`, `dist/`, `node_modules/`, `src/routeTree.gen.ts`, or `.tanstack/`. They're in `.gitignore`.
