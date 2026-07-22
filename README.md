# Pour'd

I built this because I kept forgetting what wines I'd tried and wanted a better way to track them. Pour'd is a social wine check-in app — log what you're drinking, rate it, see what friends are pouring, and actually remember the good ones.

## What it does

You open the app, hit the + button, search for your wine, pick where you are, try to guess the tasting notes before they're revealed, then rate it. That check-in shows up in your feed and your friends can clink (like) it. Simple.

The wine search is where it gets interesting — it searches a local database first with typo tolerance (because "Chardonnay" is hard to spell after a glass), then falls back to a catalog of 300,000+ wines from GrapeMinds if it's not already in the system. First time someone checks in a wine, it gets added for everyone.

## Built with

- **React Native + Expo** — iOS and Android from one codebase
- **Hono** — lightweight Node.js API server
- **Better Auth** — authentication with bearer tokens
- **Neon Postgres + Drizzle** — database and ORM
- **Cloudflare R2** — photo storage
- **Meilisearch** — search that actually works (typo-tolerant, fast)
- **GrapeMinds API** — external wine catalog (300,000+ wines)
- **NativeWind** — Tailwind CSS for React Native
- **TypeScript** throughout

## Running locally

You need two terminals:

**Terminal 1 — API server:**
```bash
cd api
npm install
npm run dev
```

**Terminal 2 — Expo app:**
```bash
npm install
npx expo start
```

**Environment variables:**

Expo app (`.env.local`):
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_MEILI_HOST=...
EXPO_PUBLIC_MEILI_SEARCH_KEY=...
EXPO_PUBLIC_GRAPEMINDS_API_KEY=...
```

API server (`api/.env`):
```
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pourd
R2_PUBLIC_URL=...
```

To sync wines into Meilisearch:
```bash
npm run sync:wines
```
