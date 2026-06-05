import { Wine } from '@/types/database';

const HOST = process.env.EXPO_PUBLIC_MEILI_HOST ?? '';
const KEY = process.env.EXPO_PUBLIC_MEILI_SEARCH_KEY ?? '';

export async function searchMeiliWines(q: string, limit = 20): Promise<Wine[]> {
  if (!HOST || q.length < 2) return [];
  try {
    const res = await fetch(`${HOST}/indexes/wines/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q, limit }),
    });
    if (!res.ok) return [];
    const { hits } = await res.json();
    return (hits ?? []) as Wine[];
  } catch {
    return [];
  }
}
