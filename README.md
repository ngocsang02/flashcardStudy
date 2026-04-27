# Vocab Flashcard Website (Next.js + Supabase)

A full-stack vocabulary learning website built with Next.js 14 App Router, TypeScript, Tailwind CSS and Supabase. Users can search an English word, pick an image, view pronunciation + dictionary data, add Vietnamese meaning, then save as flashcard.

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- API Routes + Server Actions
- Supabase Postgres storage
- Sonner toast notifications

## Features

- Home page with centered, responsive search UI
- Auto image search using Unsplash Search API
- Dictionary data from Dictionary API
- Pronunciation button linking to Elsa Speak page
- Vietnamese translation via free API + manual fallback input
- Create flashcard
- My Flashcards page with:
  - Grid cards
  - Flip animation
  - Edit card
  - Delete card
  - Favorite card
- Search history (localStorage)
- Study mode route (`/study`)

## Project Structure

- `app/page.tsx`
- `app/flashcards/page.tsx`
- `app/api/search-images/route.ts`
- `app/api/dictionary/route.ts`
- `components/*`
- `lib/*`
- `styles/*`

## 1) Install

```bash
npm install
```

## 2) Setup environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill values:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon public key
- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`: Unsplash Access Key (used by the route with `client_id` query param)

## 3) Setup Supabase table

In Supabase SQL Editor, run SQL from `lib/supabase-schema.sql`.

## 4) Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5) Deploy to Vercel (Step by step)

1. Push this project to GitHub.
2. Go to Vercel and import the GitHub repository.
3. In Vercel Project Settings > Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`
4. Click Deploy.
5. After deployment, test:
   - Search a word
   - Select image
   - Open pronunciation
   - Create flashcard
   - Edit/Delete/Favorite in `/flashcards`

## Notes

- Image source is only Unsplash Search API (`/search/photos`).
- Translation API may fail sometimes; users can always type Vietnamese meaning manually.
- For production with user accounts, replace open RLS policy with authenticated policies.
