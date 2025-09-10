import { uploadToBlob } from '@/lib/blob';

describe('blob client', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
    process.env.BLOB_READ_WRITE_TOKEN = 'token_test';
    process.env.BLOB_BASE_URL = 'https://blob.vercel-storage.com';
  });

  it('uploads to BLOB with Authorization and returns URL', async () => {
    const body = new Blob(['abc'], { type: 'image/png' });
    const { url } = await uploadToBlob('session_x/user/front/photo.png', body, 'image/png');
    expect(fetch).toHaveBeenCalled();
    const [calledUrl, init] = (fetch as jest.Mock).mock.calls[0];
    expect(String(calledUrl)).toBe('https://blob.vercel-storage.com/session_x/user/front/photo.png');
    expect((init as any).method).toBe('PUT');
    expect((init as any).headers.Authorization).toMatch(/Bearer/);
    expect(url).toMatch(/blob\.vercel-storage\.com/);
  });

  it('throws on missing token', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(uploadToBlob('a/b.png', new Blob(['a']), 'image/png')).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
  });
});

