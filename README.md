# ChenHub

ChenHub is a private shared app for two users with:

- **Scrapbook**: create, filter, view, and delete polaroid memories
- **Letters**: create, edit, view, and delete shared letters

Built with **SvelteKit 2 + Svelte 5**, **Tailwind CSS 4**, **Bits UI**, and **Supabase** (Auth + Postgres + Storage).

## Current app behavior

- Auth-required app shell with sidebar navigation (`/scrapbook`, `/letters`)
- Login/signup page at `/login`
- Signup is currently restricted to an in-code allowlist in `src/routes/(auth)/login/+page.svelte`
- Root app route redirects to `/scrapbook`
- Supabase OAuth/email callback handled at `/auth/callback`

## Tech stack

- SvelteKit `^2.50.2`
- Svelte `^5.49.2`
- Vite `^7.3.1`
- Tailwind CSS `^4.1.18`
- Bits UI `^2.15.5`
- Supabase SSR + JS clients

## Prerequisites

- **Node.js**: `>=20.19` or `>=22.12` (Vite 7 requirement)
- **pnpm**
- A Supabase project

## Environment variables

Copy `.env.example` to `.env` and fill in:

```env
PUBLIC_SUPABASE_URL=your-project-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase setup (required)

This repo expects the following resources in Supabase:

1. **Tables**
   - `letters`
   - `scrapbook_entries`
   - `scrapbook_polaroids`
2. **Storage bucket**
   - `scrapbook-polaroids` (public URLs are used for display)
3. **Auth**
   - Email/password auth enabled
   - Callback URL configured for `/auth/callback`

## Local development

```sh
pnpm install
pnpm dev
```

App runs at `http://localhost:5173` by default.

## Scripts

```sh
pnpm dev          # start Vite dev server
pnpm build        # production build
pnpm preview      # preview production build locally
pnpm check        # sync SvelteKit + typecheck
pnpm check:watch  # typecheck in watch mode
```
