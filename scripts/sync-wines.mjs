import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local (split on first = to handle base64 values)
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env['EXPO_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const MEILI_HOST = env['EXPO_PUBLIC_MEILI_HOST'];
const MEILI_ADMIN_KEY = env['MEILI_ADMIN_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY || !MEILI_HOST || !MEILI_ADMIN_KEY) {
  console.error('Missing required env vars. Check .env.local');
  process.exit(1);
}

async function fetchAllWines() {
  const wines = [];
  let from = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/wines?select=*&limit=${limit}&offset=${from}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await res.json();
    wines.push(...data);
    if (data.length < limit) break;
    from += limit;
  }
  return wines;
}

async function meili(method, path, body) {
  const res = await fetch(`${MEILI_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${MEILI_ADMIN_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const wines = await fetchAllWines();
console.log(`Fetched ${wines.length} wines from Supabase`);

// Configure searchable attributes
await meili('PUT', '/indexes/wines/settings/searchable-attributes', [
  'name', 'winery', 'varietals', 'region', 'country',
]);
console.log('Configured searchable attributes');

// Index all wines
const task = await meili('POST', '/indexes/wines/documents?primaryKey=id', wines);
console.log('Index task:', task);
console.log('Done — check the Meilisearch dashboard Search preview to verify.');
