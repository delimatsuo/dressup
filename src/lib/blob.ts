function getEnv(name: string) {
  // Prefer live env, then test overrides during jest runs
  return (globalThis as any)[name] || process.env[name];
}

const BLOB_BASE = getEnv('BLOB_BASE_URL') || 'https://blob.vercel-storage.com';
const getToken = () => getEnv('BLOB_READ_WRITE_TOKEN');

export async function uploadToBlob(path: string, body: Blob | ArrayBuffer | Uint8Array, contentType: string) {
  const token = getToken();
  
  if (!token) {
    // For local development, create a data URL instead of uploading to Vercel Blob
    console.warn('BLOB_READ_WRITE_TOKEN not set: using data URL for local development');
    
    let base64Data: string;
    if (body instanceof Blob) {
      const arrayBuffer = await body.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      base64Data = btoa(String.fromCharCode(...uint8Array));
    } else if (body instanceof ArrayBuffer) {
      const uint8Array = new Uint8Array(body);
      base64Data = btoa(String.fromCharCode(...uint8Array));
    } else {
      base64Data = btoa(String.fromCharCode(...body));
    }
    
    const dataUrl = `data:${contentType || 'application/octet-stream'};base64,${base64Data}`;
    return { url: dataUrl };
  }
  
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
