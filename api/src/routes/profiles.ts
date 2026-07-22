import { Hono } from 'hono';
import { eq, ilike, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles } from '../db/schema.js';
import { requireAuth } from '../middleware/require-auth.js';

const app = new Hono();

app.get('/search', async (c) => {
  const q = c.req.query('q') ?? '';
  const results = await db.select().from(profiles)
    .where(or(ilike(profiles.username, `%${q}%`), ilike(profiles.display_name, `%${q}%`)))
    .limit(20);
  return c.json(results);
});

app.get('/:id', async (c) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, c.req.param('id')));
  if (!profile) return c.json({ error: 'Not found' }, 404);
  return c.json(profile);
});

app.put('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  if (id !== c.get('userId')) return c.json({ error: 'Forbidden' }, 403);
  const { display_name, bio, avatar_url } = await c.req.json();
  const [updated] = await db.update(profiles)
    .set({ display_name, bio, avatar_url })
    .where(eq(profiles.id, id))
    .returning();
  return c.json(updated);
});

export default app;
