import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clinks } from '../db/schema.js';
import { requireAuth } from '../middleware/require-auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('*', requireAuth);

app.post('/', async (c) => {
  const userId = c.get('userId');
  const { checkin_id } = await c.req.json();
  const [clink] = await db.insert(clinks).values({ checkin_id, user_id: userId }).returning();
  return c.json(clink, 201);
});

app.delete('/:checkinId', async (c) => {
  const userId = c.get('userId');
  await db.delete(clinks).where(
    and(eq(clinks.checkin_id, c.req.param('checkinId')), eq(clinks.user_id, userId))
  );
  return c.json({ ok: true });
});

export default app;
