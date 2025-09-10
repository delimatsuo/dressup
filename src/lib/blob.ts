function getEnv(name: string) {
  // Prefer live env, then test overrides during jest runs
  return (globalThis as any)[name] || process.env[name];
}

const BLOB_BASE = getEnv('BLOB_BASE_URL') || 'https://blob.vercel-storage.com';
const getToken = () => getEnv('BLOB_READ_WRITE_TOKEN');

export async function uploadToBlob(path: string, body: Blob | ArrayBuffer | Uint8Array, contentType: string) {
  const token = getToken();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  const url = `${BLOB_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: body as any,
  });
  if (!res.ok) {
    throw new Error(`Blob upload failed: ${res.status}`);
  }
  return { url };
}
