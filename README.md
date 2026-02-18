# ChenHub

ChenHub is a private shared app for two users with:

- **Scrapbook**: create, filter, view, and delete polaroid memories with shared tags
- **Letters**: create, edit, view, and delete shared letters
- **Bucket List**: add, edit, filter, and delete shared bucket list ideas with an "I'm Feeling Lucky" random picker
- **Settings**: manage shared tags and set default scrapbook filter preferences

Built with **SvelteKit 2 + Svelte 5**, **Tailwind CSS 4**, **Bits UI**, and **Supabase** (Auth + Postgres + Storage).

## Current app behavior

- Auth-required app shell with sidebar navigation (`/scrapbook`, `/letters`, `/bucket-list`)
- Login/signup page at `/login`
- Signup is currently restricted to an in-code allowlist in `src/routes/(auth)/login/+page.svelte`
- Root app route redirects to `/scrapbook`
- Settings accessible via user menu dropdown (click email in sidebar)
- Supabase OAuth/email callback handled at `/auth/callback`

## Features

### Scrapbook
- Create memories with polaroid photos
- Tag entries with shared tags (both users can create and use tags)
- Filter entries by tag or date range
- Set default tag filter in Settings

### Letters
- Write letters to each other
- Paginated list view with content preview
- Click through to read the full letter

### Bucket List
- Add ideas with a title, description, and tags
- Both users can edit any item; only the creator can delete it
- Filter by tag (uses the same shared tags system as scrapbook)
- "I'm Feeling Lucky" button picks a random item from the full list
- Paginated card grid

### Shared Tags System
- All tags are shared between users
- Both users can create new tags
- Users can only delete tags they created
- Tags are case-insensitive (e.g., "Work" and "work" are the same)
- Deleting a tag removes it from all entries using efficient Postgres function
- Tag and date filtering is server-side for consistent pagination results

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
   - `bucket_list_items` (see `migrations/create_bucket_list_table.sql`)
   - `user_preferences` (for default tag filter settings)
   - `tags` (shared tags system)
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
