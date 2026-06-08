# Pour'd 🍷

I built this because I kept forgetting what wines I'd tried and wanted a better way to track them. Pour'd is a social wine check-in app — log what you're drinking, rate it, see what friends are pouring, and actually remember the good ones.

## What it does

You open the app, hit the + button, search for your wine, pick where you are, try to guess the tasting notes before they're revealed, then rate it. That check-in shows up in your feed and your friends can clink (like) it. Simple.

The wine search is where it gets interesting — it searches a local database first with typo tolerance (because "Chardonnay" is hard to spell after a glass), then falls back to a catalog of 300,000+ wines from GrapeMinds if it's not already in the system. First time someone checks in a wine, it gets added for everyone.

## Built with

- **React Native + Expo** — iOS and Android from one codebase
- **Supabase** — auth, database, and photo storage
- **Meilisearch** — search that actually works (typo-tolerant, fast)
- **GrapeMinds API** — external wine database
- **NativeWind** — Tailwind CSS styling for React Native
- **TypeScript** throughout

## Running it locally

```bash
npm install
npx expo start
```

You'll need a `.env.local` with keys for Supabase, Meilisearch, and GrapeMinds. Scan the QR code with Expo Go on your phone.

To sync wines into Meilisearch:
```bash
npm run sync:wines
```
