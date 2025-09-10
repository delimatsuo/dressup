import { validateUpload, type UploadInput } from '@/lib/upload';

describe('upload lib', () => {
  const baseInput: UploadInput = {
    sessionId: 'session_abc',
    category: 'user',
    type: 'front',
    fileName: 'photo.jpg',
    contentType: 'image/jpeg',
    size: 1024,
  };

  it('accepts valid JPEG under size limit', () => {
    const result = validateUpload(baseInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.path).toMatch(/session_abc\/user\/front\/photo.jpg$/);
      expect(result.value.contentType).toBe('image/jpeg');
    }
  });

  it('rejects invalid mime type', () => {
    const bad = { ...baseInput, contentType: 'image/svg+xml' };
    const result = validateUpload(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid file type/);
  });

  it('rejects oversized file', () => {
    const tooBig = { ...baseInput, size: 5 * 1024 * 1024 };
    const result = validateUpload(tooBig);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/exceeds 4MB/);
  });

  it('sanitizes path components', () => {
    const tricky = {
      ...baseInput,
      sessionId: 'session_..//x',
      fileName: '../../secret.png',
      contentType: 'image/png',
    };
    const result = validateUpload(tricky);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.path).not.toMatch(/\.\./);
      expect(result.value.path).toMatch(/\.png$/);
    }
  });
});

