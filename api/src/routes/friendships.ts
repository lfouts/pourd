import { Hono } from 'hono';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { friendships } from '../db/schema.js';
import { requireAuth } from '../middleware/require-auth.js';

const app = new Hono<{ Variables: { userId: string } }>();

app.use('*', requireAuth);

// Accepted friendships (used by feed to get friend IDs)
app.get('/', async (c) => {
  const userId = c.get('userId');
  const results = await db.select().from(friendships).where(
    and(
      eq(friendships.status, 'accepted'),
      or(eq(friendships.user_id, userId), eq(friendships.friend_id, userId))
    )
  );
  return c.json(results);
});

// Pending requests received (activity tab)
app.get('/requests', async (c) => {
  const userId = c.get('userId');
  const results = await db.query.friendships.findMany({
    where: (f, { and, eq }) => and(eq(f.friend_id, userId), eq(f.status, 'pending')),
    with: { user: true },
  });
  return c.json(results);
});

// Check friendship status with a specific user
app.get('/status/:otherId', async (c) => {
  const userId = c.get('userId');
  const otherId = c.req.param('otherId');
  const [row] = await db.select().from(friendships).where(
    or(
      and(eq(friendships.user_id, userId), eq(friendships.friend_id, otherId)),
      and(eq(friendships.user_id, otherId), eq(friendships.friend_id, userId))
    )
  );
  return c.json(row ?? null);
});

// Send friend request
app.post('/', async (c) => {
  const userId = c.get('userId');
  const { friend_id } = await c.req.json();
  const [row] = await db.insert(friendships).values({ user_id: userId, friend_id }).returning();
  return c.json(row, 201);
});

// Accept friend request
app.put('/:id', async (c) => {
  const userId = c.get('userId');
  const [row] = await db.update(friendships)
    .set({ status: 'accepted' })
    .where(and(eq(friendships.id, c.req.param('id')), eq(friendships.friend_id, userId)))
    .returning();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// Decline or remove friendship
app.delete('/:id', async (c) => {
  const userId = c.get('userId');
  await db.delete(friendships).where(
    and(
      eq(friendships.id, c.req.param('id')),
      or(eq(friendships.user_id, userId), eq(friendships.friend_id, userId))
    )
  );
  return c.json({ ok: true });
});

export default app;
