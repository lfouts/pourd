import { Hono } from 'hono';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAuth } from '../middleware/require-auth.js';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const app = new Hono<{ Variables: { userId: string } }>();

app.use('*', requireAuth);

app.post('/avatar', async (c) => {
  const userId = c.get('userId');
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  if (!file) return c.json({ error: 'No file provided' }, 400);

  const ext = file.name.split('.').pop() ?? 'jpg';
  const key = `avatars/${userId}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }));

  return c.json({ url: `${PUBLIC_URL}/${key}` });
});

app.post('/wine-label', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const wineId = formData.get('wineId') as string | null;
  if (!file) return c.json({ error: 'No file provided' }, 400);

  const ext = file.name.split('.').pop() ?? 'jpg';
  const key = `wine-labels/${wineId ?? Date.now()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }));

  return c.json({ url: `${PUBLIC_URL}/${key}` });
});

export default app;
