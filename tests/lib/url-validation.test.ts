import { isHttpOrDataUrl } from '@/lib/url';

describe('isHttpOrDataUrl', () => {
  it('accepts http/https URLs', () => {
    expect(isHttpOrDataUrl('http://example.com/a.jpg')).toBe(true);
    expect(isHttpOrDataUrl('https://example.com/a.jpg')).toBe(true);
  });
  it('accepts data URLs', () => {
    expect(isHttpOrDataUrl('data:image/jpeg;base64,abc')).toBe(true);
  });
  it('rejects empty or invalid', () => {
    expect(isHttpOrDataUrl('')).toBe(false);
    expect(isHttpOrDataUrl('ftp://example')).toBe(false);
    expect(isHttpOrDataUrl('file:///a/b')).toBe(false);
  });
});

