import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const SESSION_KEY = 'auth_session';

type StoredSession = { token: string; user: any };

async function getStoredSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function setStoredSession(session: StoredSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

async function clearStoredSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, skipAuth = false): Promise<T> {
  const session = skipAuth ? null : await getStoredSession();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401) {
    await clearStoredSession();
    router.replace('/(auth)/sign-in');
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

async function uploadFile(path: string, file: { uri: string; name: string; type: string }, fields?: Record<string, string>): Promise<{ url: string }> {
  const session = await getStoredSession();
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  if (fields) Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
    body: formData,
  });
  return res.json();
}

export const api = {
  auth: {
    getCurrentUser: async () => (await getStoredSession())?.user ?? null,
    signUp: async (email: string, password: string, username: string) => {
      await clearStoredSession();
      // Sign out first to invalidate any iOS-cached session cookie
      try { await fetch(`${BASE}/api/auth/sign-out`, { method: 'POST' }); } catch {}
      const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: username }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const token = res.headers.get('set-auth-token') ?? data.token;
      const session = { token, user: data.user };
      await setStoredSession(session);
      return session;
    },
    signIn: async (email: string, password: string) => {
      await clearStoredSession();
      try { await fetch(`${BASE}/api/auth/sign-out`, { method: 'POST' }); } catch {}
      const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const token = res.headers.get('set-auth-token') ?? data.token;
      const session = { token, user: data.user };
      await setStoredSession(session);
      return session;
    },
    signOut: async () => {
      try { await request('/api/auth/sign-out', { method: 'POST' }); } catch {}
      await clearStoredSession();
    },
  },
  profiles: {
    get: (id: string) => request<any>(`/api/profiles/${id}`),
    update: (id: string, data: Partial<{ display_name: string; bio: string; avatar_url: string }>) =>
      request<any>(`/api/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    search: (q: string) => request<any[]>(`/api/profiles/search?q=${encodeURIComponent(q)}`),
  },
  wines: {
    get: (id: string) => request<any>(`/api/wines/${id}`),
    search: (q: string) => request<any[]>(`/api/wines/search?q=${encodeURIComponent(q)}`),
    create: (data: any) => request<any>('/api/wines', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/wines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  venues: {
    search: (q: string) => request<any[]>(`/api/venues/search?q=${encodeURIComponent(q)}`),
    create: (data: any) => request<any>('/api/venues', { method: 'POST', body: JSON.stringify(data) }),
  },
  checkins: {
    feed: (page = 0) => request<any[]>(`/api/checkins/feed?page=${page}`),
    list: (userId: string) => request<any[]>(`/api/checkins?userId=${encodeURIComponent(userId)}`),
    create: (data: any) => request<any>('/api/checkins', { method: 'POST', body: JSON.stringify(data) }),
  },
  clinks: {
    add: (checkin_id: string) => request<any>('/api/clinks', { method: 'POST', body: JSON.stringify({ checkin_id }) }),
    remove: (checkinId: string) => request<any>(`/api/clinks/${checkinId}`, { method: 'DELETE' }),
  },
  friendships: {
    requests: () => request<any[]>('/api/friendships/requests'),
    status: (otherId: string) => request<any | null>(`/api/friendships/status/${otherId}`),
    send: (friend_id: string) => request<any>('/api/friendships', { method: 'POST', body: JSON.stringify({ friend_id }) }),
    accept: (id: string) => request<any>(`/api/friendships/${id}`, { method: 'PUT' }),
    remove: (id: string) => request<any>(`/api/friendships/${id}`, { method: 'DELETE' }),
  },
  upload: {
    avatar: (uri: string, ext: string) =>
      uploadFile('/api/upload/avatar', { uri, name: `avatar.${ext}`, type: `image/${ext}` }),
    wineLabel: (uri: string, ext: string, wineId?: string) =>
      uploadFile('/api/upload/wine-label', { uri, name: `label.${ext}`, type: `image/${ext}` }, wineId ? { wineId } : undefined),
  },
};
