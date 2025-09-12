export function shouldConvertHeic(fileName: string, contentType?: string): boolean {
  const ct = (contentType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  if (ct.includes('image/heic') || ct.includes('image/heif')) return true;
  if (name.endsWith('.heic') || name.endsWith('.heif')) return true;
  return false;
}

// Best-effort HEIC->JPEG conversion using @squoosh/lib if available.
// Returns { buffer, type } on success, or null on failure (caller should fallback to original file).
export async function convertHeicToJpeg(ab: ArrayBuffer): Promise<{ buffer: Uint8Array; type: string } | null> {
  try {
    // Dynamic import to avoid hard dependency when not installed
    const mod: any = await import('@squoosh/lib').catch(() => null);
    if (!mod || !mod.ImagePool) return null;
    const { ImagePool } = mod;
    const imagePool = new ImagePool(1);
    const image = imagePool.ingestImage(new Uint8Array(ab));
    await image.encode({
      mozjpeg: { quality: 85 },
    });
    const encoded = await image.encodedWith.mozjpeg;
    const buf = new Uint8Array(await encoded.binary);
    await imagePool.close();
    return { buffer: buf, type: 'image/jpeg' };
  } catch (e) {
    // On any error, fallback to original
    return null;
  }
}

