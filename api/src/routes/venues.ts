import { Hono } from 'hono';
import { ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { venues } from '../db/schema.js';
import { requireAuth } from '../middleware/require-auth.js';

const app = new Hono();

app.get('/search', async (c) => {
  const q = c.req.query('q') ?? '';
  const results = await db.select().from(venues)
    .where(ilike(venues.name, `%${q}%`))
    .limit(20);
  return c.json(results);
});

app.post('/', requireAuth, async (c) => {
  const body = await c.req.json();
  const [venue] = await db.insert(venues).values({
    name: body.name,
    type: body.type ?? 'other',
    address: body.address ?? null,
    city: body.city ?? null,
    country: body.country ?? null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
  }).returning();
  return c.json(venue, 201);
});

export default app;
