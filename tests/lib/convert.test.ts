import { shouldConvertHeic } from '@/lib/convert';

describe('shouldConvertHeic', () => {
  it('detects by content type', () => {
    expect(shouldConvertHeic('photo.jpg', 'image/heic')).toBe(true);
    expect(shouldConvertHeic('photo.jpg', 'image/heif')).toBe(true);
  });
  it('detects by filename', () => {
    expect(shouldConvertHeic('photo.HEIC', '')).toBe(true);
    expect(shouldConvertHeic('photo.heif', '')).toBe(true);
  });
  it('ignores non-heic', () => {
    expect(shouldConvertHeic('photo.jpg', 'image/jpeg')).toBe(false);
    expect(shouldConvertHeic('photo.png', 'image/png')).toBe(false);
  });
});

