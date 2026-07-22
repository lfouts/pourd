import { Hono } from 'hono';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { wines, checkins } from '../db/schema.js';
import { requireAuth } from '../middleware/require-auth.js';

const app = new Hono();

app.get('/search', async (c) => {
  const q = c.req.query('q') ?? '';
  const results = await db.select().from(wines)
    .where(or(ilike(wines.name, `%${q}%`), ilike(wines.winery, `%${q}%`)))
    .limit(20);
  return c.json(results);
});

app.get('/:id', async (c) => {
  const [wine] = await db.select().from(wines).where(eq(wines.id, c.req.param('id')));
  if (!wine) return c.json({ error: 'Not found' }, 404);

  const wineCheckins = await db.query.checkins.findMany({
    where: (c, { eq, and }) => and(eq(c.wine_id, wine.id), eq(c.is_public, true)),
    with: { profile: true },
    orderBy: (c, { desc }) => [desc(c.created_at)],
    limit: 20,
  });

  return c.json({ ...wine, checkins: wineCheckins });
});

app.post('/', requireAuth, async (c) => {
  const body = await c.req.json();
  const [wine] = await db.insert(wines).values({
    name: body.name,
    winery: body.winery,
    varietals: body.varietals ?? [],
    region: body.region ?? null,
    country: body.country ?? null,
    vintage: body.vintage ?? null,
    label_image_url: body.label_image_url ?? null,
    official_notes: body.official_notes ?? null,
  }).returning();
  return c.json(wine, 201);
});

app.put('/:id', requireAuth, async (c) => {
  const { label_image_url } = await c.req.json();
  const [updated] = await db.update(wines)
    .set({ label_image_url })
    .where(eq(wines.id, c.req.param('id')))
    .returning();
  return c.json(updated);
});

export default app;
