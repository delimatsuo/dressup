// Minimal KV REST client for Vercel KV (Upstash-compatible)
// Uses KV_REST_API_URL and KV_REST_API_TOKEN

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function assertConfigured() {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error('KV not configured: set KV_REST_API_URL and KV_REST_API_TOKEN');
  }
}

export async function kvSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  assertConfigured();
  const url = new URL(`${KV_URL}/set/${encodeURIComponent(key)}`);
  if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
    url.searchParams.set('ex', String(ttlSeconds));
  }
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    throw new Error(`KV set failed: ${res.status} ${await res.text()}`);
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  assertConfigured();
  const url = `${KV_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`KV get failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  // Upstash returns { result: <value> } or { value: <value> } depending on API flavor
  const value = (data && (data.result ?? data.value)) as T | undefined;
  return value == null ? null : (value as T);
}

export async function kvDel(key: string): Promise<void> {
  assertConfigured();
  const url = `${KV_URL}/del/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`KV del failed: ${res.status} ${await res.text()}`);
  }
}

