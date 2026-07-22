import { Hono } from 'hono';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { checkins, friendships, wines, profiles } from '../db/schema.js';
import { requireAuth } from '../middleware/require-auth.js';

const app = new Hono();

// Friend-filtered feed
app.get('/feed', requireAuth, async (c) => {
  const userId = c.get('userId');
  const page = Number(c.req.query('page') ?? 0);

  const accepted = await db.select().from(friendships)
    .where(and(
      eq(friendships.status, 'accepted'),
      inArray(friendships.user_id, [userId])
    ));
  const accepted2 = await db.select().from(friendships)
    .where(and(
      eq(friendships.status, 'accepted'),
      inArray(friendships.friend_id, [userId])
    ));

  const friendIds = [
    userId,
    ...accepted.map((f) => f.friend_id),
    ...accepted2.map((f) => f.user_id),
  ];

  const feed = await db.query.checkins.findMany({
    where: (c, { and, eq, inArray }) => and(
      eq(c.is_public, true),
      inArray(c.user_id, friendIds)
    ),
    with: { wine: true, venue: true, profile: true, clinks: true },
    orderBy: (c, { desc }) => [desc(c.created_at)],
    limit: 20,
    offset: page * 20,
  });

  return c.json(feed);
});

// User's checkins (profile page / public user page)
app.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const targetId = c.req.query('userId') ?? userId;
  const isOwn = targetId === userId;

  const results = await db.query.checkins.findMany({
    where: (c, { and, eq }) => isOwn
      ? eq(c.user_id, targetId)
      : and(eq(c.user_id, targetId), eq(c.is_public, true)),
    with: { wine: true, venue: true, clinks: true },
    orderBy: (c, { desc }) => [desc(c.created_at)],
  });

  return c.json(results);
});

// Create checkin (replaces Supabase insert + update_wine_stats trigger)
app.post('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const [checkin] = await db.insert(checkins).values({
    user_id: userId,
    wine_id: body.wine_id,
    venue_id: body.venue_id ?? null,
    rating: body.rating,
    description: body.description ?? null,
    guessed_notes: body.guessed_notes ?? null,
    actual_notes: body.actual_notes ?? null,
    serving_style: body.serving_style ?? null,
    photo_url: body.photo_url ?? null,
    is_public: body.is_public ?? true,
  }).returning();

  // Replaces update_wine_stats trigger
  await db.update(wines).set({
    total_checkins: sql`(select count(*) from checkins where wine_id = ${body.wine_id})`,
    avg_rating: sql`(select avg(rating) from checkins where wine_id = ${body.wine_id})`,
  }).where(eq(wines.id, body.wine_id));

  await db.update(profiles).set({
    total_checkins: sql`(select count(*) from checkins where user_id = ${userId})`,
  }).where(eq(profiles.id, userId));

  return c.json(checkin, 201);
});

export default app;
