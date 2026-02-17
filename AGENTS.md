# AGENTS.md — Guidance for AI Coding Agents

## Project Overview

ChenHub is a private shared app for two users with a scrapbook, shared letters, shared tags, and per-user settings. Built with **SvelteKit 2 + Svelte 5** (runes), **Tailwind CSS 4**, **Bits UI / shadcn-svelte**, and **Supabase** (Auth, Postgres, Storage). Package manager is **pnpm**.

## Project Structure

```
src/
├── app.d.ts                # Global types (App.Locals, App.PageData)
├── app.html                # HTML shell + theme flash prevention
├── hooks.server.ts         # Per-request Supabase client + safeGetSession
├── lib/
│   ├── components/ui/      # shadcn-svelte components (Bits UI)
│   ├── supabase/           # Client + server Supabase factories
│   ├── types/              # Shared TypeScript interfaces
│   └── utils/              # cn(), pagination helpers
├── routes/
│   ├── layout.css          # Tailwind + theme CSS variables
│   ├── (app)/              # Auth-required routes (sidebar layout)
│   ├── (auth)/             # Public auth routes (login)
│   └── auth/callback/      # OAuth code exchange
migrations/                 # SQL migrations (run manually in Supabase SQL Editor)
```

## Svelte 5 Conventions

This project uses **Svelte 5 runes exclusively**. Do NOT use Svelte 4 syntax.

- `$state()` for reactive state, `$derived()` / `$derived.by()` for computed values
- `$props()` for component props, `$bindable()` for two-way bindings
- `{@render children()}` snippets — never `<slot />`
- `$effect()` for side effects
- `.svelte.ts` extension for files using runes in module context

## Styling & Components

- **Tailwind CSS 4** via `@tailwindcss/vite` plugin (NOT PostCSS)
- Theme variables in `src/routes/layout.css` (`:root` / `.dark`)
- `cn()` from `$lib/utils` for class merging (`clsx` + `tailwind-merge`)
- UI components in `src/lib/components/ui/` follow shadcn-svelte conventions with barrel `index.ts` exports

## Supabase Patterns

- **Server-side**: `locals.supabase` (from `hooks.server.ts`)
- **Client-side**: `data.supabase` (from layout data in `+layout.ts`)
- **No ORM** — direct Supabase client calls (`.from()`, `.select()`, `.insert()`, `.rpc()`, etc.)
- SQL migrations in `migrations/` — document run order in `README.md` when adding new ones
- **Prefer Postgres functions** for bulk/batch operations instead of iterating client-side (e.g. `remove_tag_from_entries` deletes a tag from all entries in one call rather than looping in O(n)). Call via `.rpc()`
- Tags are **case-insensitive** — use `.ilike()` when querying by name
- `__all__` is a sentinel URL param value meaning "no tag filter"

## Auth Flow

1. `hooks.server.ts` attaches `supabase` + `safeGetSession` to `event.locals`
2. `(app)/+layout.server.ts` enforces auth — redirects to `/login` if no session
3. Pages access auth via `data.session` and database via `data.supabase`
4. Signup restricted to an in-code allowlist in `src/routes/(auth)/login/+page.svelte`

## Server-Side Patterns

- Import types from `./$types` (`PageServerLoad`, `Actions`)
- Use `locals.safeGetSession()` for session, `locals.supabase` for DB
- Form actions return `{ success: boolean, error?: string, action: string }`
- Client-side mutations use `data.supabase` directly, then `invalidateAll()` to refresh
- Pagination via `$lib/utils/pagination.ts` — `getPaginationParams()` / `buildPaginationMeta()`

## Import Conventions

- `$lib/` for `src/lib/`, `@/` for `src/`
- Include `.js` extensions in server-file imports (e.g. `$lib/utils/pagination.js`)
- Import SvelteKit types from `./$types`

## Environment Variables

Two required vars (both `$env/static/public`):

```
PUBLIC_SUPABASE_URL=<supabase-project-url>
PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Development

```sh
pnpm dev       # Vite dev server (localhost:5173)
pnpm build     # Production build
pnpm check     # SvelteKit sync + typecheck
```

Pre-commit hook runs `pnpm check && pnpm build`.

## Don'ts

- **Don't use Svelte 4 syntax** — no `export let`, no `<slot />`, no `$:` reactive statements
- **Don't over-engineer simple features** — this is a small two-user app, keep it simple
- **Don't hard-code API keys or secrets** — use environment variables via `$env/`
- **Don't commit `.env`** — it contains Supabase credentials
- **Don't modify these files/directories** unless explicitly asked:
  - `src/hooks.server.ts` — core auth/request setup
  - `src/app.html` — HTML shell with theme script
  - `src/app.d.ts` — global type definitions
  - `src/lib/supabase/` — Supabase client factories
  - `src/routes/+layout.server.ts`, `src/routes/+layout.ts` — root layout data
  - `scripts/hooks/` — git hooks
- **Don't install new dependencies without asking** — keep the dependency footprint small
- **Don't add a test framework** unless specifically requested
- **Don't use PostCSS for Tailwind** — this project uses the Vite plugin
