import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth.js';
import profilesRoutes from './routes/profiles.js';
import winesRoutes from './routes/wines.js';
import venuesRoutes from './routes/venues.js';
import checkinsRoutes from './routes/checkins.js';
import clinksRoutes from './routes/clinks.js';
import friendshipsRoutes from './routes/friendships.js';
import uploadRoutes from './routes/upload.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Better Auth handles all /api/auth/* routes
app.all('/api/auth/*', async (c) => {
  const path = new URL(c.req.url).pathname;
  // Strip cookies on sign-up/sign-in so iOS cached cookies don't cause 403
  if (path.includes('/sign-up') || path.includes('/sign-in')) {
    const headers = new Headers(c.req.raw.headers);
    headers.delete('cookie');
    return auth.handler(new Request(c.req.raw, { headers }));
  }
  return auth.handler(c.req.raw);
});

app.route('/api/profiles', profilesRoutes);
app.route('/api/wines', winesRoutes);
app.route('/api/venues', venuesRoutes);
app.route('/api/checkins', checkinsRoutes);
app.route('/api/clinks', clinksRoutes);
app.route('/api/friendships', friendshipsRoutes);
app.route('/api/upload', uploadRoutes);

app.get('/', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
