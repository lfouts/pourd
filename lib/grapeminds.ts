const BASE_URL = 'https://api.grapeminds.eu/public/v1';
const API_KEY = process.env.EXPO_PUBLIC_GRAPEMINDS_API_KEY ?? '';

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Accept-Language': 'en',
    'Content-Type': 'application/json',
  };
}

export interface GrapeMindsWine {
  id: number;
  name: string;
  producer: { id: number; name: string };
  region?: { id: number; name: string } | null;
  country?: string | null;
  vintage?: number | null;
  color?: string | null;
  sub_type?: string | null;
  grape_varieties?: { name: string }[];
  tasting_notes?: string | string[] | null;
  description?: string | null;
  label_image_url?: string | null;
}

export async function searchGrapeMinds(query: string): Promise<GrapeMindsWine[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/wines/search?q=${encodeURIComponent(query)}&limit=10`,
      { headers: headers() }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const raw: any[] = json.data ?? json ?? [];
    return raw.map((w) => ({
      id: w.id,
      name: w.display_name ?? w.name ?? '',
      producer: { id: 0, name: w.producer_display_name ?? w.producer_name ?? '' },
      color: w.color ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getGrapeMindsWineDetail(id: number): Promise<GrapeMindsWine | null> {
  try {
    const res = await fetch(`${BASE_URL}/wines/${id}`, { headers: headers() });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json.data ?? json;
    if (!raw) return null;

    const producerDisplay: string = raw.producer?.display_name ?? raw.producer?.name ?? '';
    const regionName: string = raw.region?.name ?? '';
    let name: string = raw.display_name ?? raw.name ?? '';

    // Strip "Producer, " prefix and ", Region" suffix from display_name
    if (producerDisplay && name.startsWith(producerDisplay + ', '))
      name = name.slice(producerDisplay.length + 2);
    if (regionName && name.endsWith(', ' + regionName))
      name = name.slice(0, name.length - regionName.length - 2);

    return {
      id: raw.id,
      name,
      producer: raw.producer ?? { id: 0, name: producerDisplay },
      region: raw.region ?? null,
      country: raw.region?.country ?? raw.country ?? null,
      vintage: raw.vintage ?? null,
      color: raw.color ?? null,
      sub_type: raw.sub_type ?? null,
      grape_varieties: (raw.grapes ?? raw.grape_varieties ?? []).map((g: any) => ({ name: g.name ?? g })),
      tasting_notes: raw.tasting_notes ?? null,
      description: raw.description ?? null,
      label_image_url: raw.label_image_url ?? null,
    };
  } catch {
    return null;
  }
}

export async function acquirePSLicense(wineId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/licence/${wineId}`, {
      method: 'POST',
      headers: headers(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function mapToWineInsert(gm: GrapeMindsWine) {
  const varietals = gm.grape_varieties?.map((g) => g.name) ?? [];
  const region = gm.region?.name ? [gm.region.name] : null;

  const notes: string[] = [];
  if (gm.tasting_notes) {
    const raw = gm.tasting_notes;
    if (Array.isArray(raw)) {
      notes.push(...raw.map((n: any) => String(n).trim()));
    } else if (typeof raw === 'string') {
      notes.push(...raw.split(',').map((n) => n.trim()));
    }
  }

  return {
    name: gm.name,
    winery: gm.producer.name,
    varietals: varietals.length ? varietals : ['Unknown'],
    region,
    country: gm.country ?? null,
    vintage: gm.vintage ?? null,
    official_notes: notes.length ? notes.join(', ') : null,
    label_image_url: gm.label_image_url ?? null,
  };
}
