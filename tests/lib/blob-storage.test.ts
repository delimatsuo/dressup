import { 
  uploadImage, 
  deleteImage, 
  listSessionBlobs,
  getBlobMetadata,
  cleanupExpiredBlobs,
  cleanupSessionBlobs,
  generateSecureUrl,
  validateSecureUrl,
  isValidImageFormat,
  SUPPORTED_FORMATS,
  BLOB_EXPIRY_MS
} from '@/lib/blob-storage';
import { put, del, list, head } from '@vercel/blob';
import { kv } from '@vercel/kv';
import sharp from 'sharp';

// Mock dependencies
jest.mock('@vercel/blob');
jest.mock('@vercel/kv');
jest.mock('sharp');

describe('Blob Storage Service', () => {
  const mockPut = put as jest.MockedFunction<typeof put>;
  const mockDel = del as jest.MockedFunction<typeof del>;
  const mockList = list as jest.MockedFunction<typeof list>;
  const mockHead = head as jest.MockedFunction<typeof head>;
  const mockKv = kv as jest.Mocked<typeof kv>;
  const mockSharp = sharp as unknown as jest.MockedFunction<typeof sharp>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockKv.set = jest.fn().mockResolvedValue('OK');
    mockKv.get = jest.fn().mockResolvedValue(null);
    mockKv.del = jest.fn().mockResolvedValue(1);
    mockKv.keys = jest.fn().mockResolvedValue([]);
    mockKv.sadd = jest.fn().mockResolvedValue(1);
    mockKv.expire = jest.fn().mockResolvedValue(1);
    
    // Mock sharp
    const sharpInstance = {
      metadata: jest.fn().mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg'
      }),
      resize: jest.fn().mockReturnThis(),
      rotate: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image'))
    };
    
    mockSharp.mockReturnValue(sharpInstance as any);
  });

  describe('Format Validation', () => {
    it('should validate supported image formats', () => {
      expect(isValidImageFormat('image/jpeg')).toBe(true);
      expect(isValidImageFormat('image/jpg')).toBe(true);
      expect(isValidImageFormat('image/png')).toBe(true);
      expect(isValidImageFormat('image/webp')).toBe(true);
      expect(isValidImageFormat('image/heic')).toBe(true);
      expect(isValidImageFormat('image/heif')).toBe(true);
    });

    it('should reject unsupported formats', () => {
      expect(isValidImageFormat('image/gif')).toBe(false);
      expect(isValidImageFormat('image/svg+xml')).toBe(false);
      expect(isValidImageFormat('application/pdf')).toBe(false);
      expect(isValidImageFormat('text/plain')).toBe(false);
    });

    it('should have correct supported formats constant', () => {
      expect(SUPPORTED_FORMATS).toEqual([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
      ]);
    });
  });

  describe('Image Upload', () => {
    const mockFile = new File(['test-image-data'], 'test.jpg', { type: 'image/jpeg' });
    const uploadOptions = {
      sessionId: 'test-session',
      category: 'user' as const,
      type: 'front' as const,
      optimize: true,
      generateThumbnail: false
    };

    beforeEach(() => {
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/test.jpg',
        downloadUrl: 'https://blob.vercel-storage.com/test.jpg?download=1',
        pathname: 'sessions/test-session/user/front_123456_abc.jpg',
        contentType: 'image/jpeg',
        contentDisposition: 'inline; filename="test.jpg"'
      });
    });

    it('should upload an image file successfully', async () => {
      const result = await uploadImage(mockFile, uploadOptions);

      expect(result).toMatchObject({
        url: 'https://blob.vercel-storage.com/test.jpg',
        downloadUrl: 'https://blob.vercel-storage.com/test.jpg?download=1',
        contentType: 'image/jpeg',
        metadata: expect.objectContaining({
          sessionId: 'test-session',
          category: 'user',
          type: 'front',
          originalName: 'test.jpg',
          mimeType: 'image/jpeg'
        })
      });

      expect(mockPut).toHaveBeenCalled();
      expect(mockKv.set).toHaveBeenCalled();
      expect(mockKv.sadd).toHaveBeenCalled();
    });

    it('should optimize images when requested', async () => {
      await uploadImage(mockFile, { ...uploadOptions, optimize: true });

      const sharpInstance = mockSharp();
      expect(sharpInstance.resize).toHaveBeenCalled();
      expect(sharpInstance.rotate).toHaveBeenCalled();
      expect(sharpInstance.jpeg).toHaveBeenCalled();
    });

    it('should generate thumbnail when requested', async () => {
      mockPut.mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/test.jpg',
        downloadUrl: 'https://blob.vercel-storage.com/test.jpg?download=1',
        pathname: 'sessions/test-session/user/front_123456_abc.jpg',
        contentType: 'image/jpeg',
        contentDisposition: 'inline; filename="test.jpg"'
      }).mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/test_thumb.webp',
        downloadUrl: 'https://blob.vercel-storage.com/test_thumb.webp?download=1',
        pathname: 'sessions/test-session/user/front_123456_abc_thumb.webp',
        contentType: 'image/webp',
        contentDisposition: 'inline; filename="test_thumb.webp"'
      });

      const result = await uploadImage(mockFile, { 
        ...uploadOptions, 
        generateThumbnail: true 
      });

      expect(result.thumbnailUrl).toBe('https://blob.vercel-storage.com/test_thumb.webp');
      expect(mockPut).toHaveBeenCalledTimes(2);
    });

    it('should reject unsupported file formats', async () => {
      const gifFile = new File(['gif-data'], 'test.gif', { type: 'image/gif' });
      
      await expect(uploadImage(gifFile, uploadOptions)).rejects.toThrow(
        'Unsupported image format: image/gif'
      );
    });

    it('should handle HEIC/HEIF conversion to JPEG', async () => {
      const heicFile = new File(['heic-data'], 'test.heic', { type: 'image/heic' });
      
      await uploadImage(heicFile, uploadOptions);

      const sharpInstance = mockSharp();
      expect(sharpInstance.jpeg).toHaveBeenCalled();
    });

    it('should set proper expiry metadata', async () => {
      const customExpiry = 60 * 60 * 1000; // 1 hour
      const result = await uploadImage(mockFile, {
        ...uploadOptions,
        customExpiry
      });

      const expiresAt = new Date(result.metadata.expiresAt);
      const uploadedAt = new Date(result.metadata.uploadedAt);
      const diff = expiresAt.getTime() - uploadedAt.getTime();

      expect(diff).toBeGreaterThanOrEqual(customExpiry - 1000);
      expect(diff).toBeLessThanOrEqual(customExpiry + 1000);
    });

    it('should upload buffer directly', async () => {
      const buffer = Buffer.from('test-image-data');
      
      // Mock file-type dynamically
      jest.doMock('file-type', () => ({
        fileTypeFromBuffer: jest.fn().mockResolvedValue({
          mime: 'image/jpeg'
        })
      }));

      const result = await uploadImage(buffer, uploadOptions);

      expect(result).toMatchObject({
        url: 'https://blob.vercel-storage.com/test.jpg',
        metadata: expect.objectContaining({
          sessionId: 'test-session',
          category: 'user',
          type: 'front'
        })
      });
    });
  });

  describe('Image Deletion', () => {
    it('should delete an image successfully', async () => {
      const url = 'https://blob.vercel-storage.com/test.jpg';
      
      mockKv.keys.mockResolvedValue(['blob:cleanup:session:path']);
      mockKv.get.mockResolvedValue({
        url,
        thumbnailUrl: 'https://blob.vercel-storage.com/test_thumb.webp'
      });

      await deleteImage(url);

      expect(mockDel).toHaveBeenCalledWith(url);
      expect(mockDel).toHaveBeenCalledWith('https://blob.vercel-storage.com/test_thumb.webp');
      expect(mockKv.del).toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', async () => {
      const url = 'https://blob.vercel-storage.com/test.jpg';
      mockDel.mockRejectedValue(new Error('Deletion failed'));

      await expect(deleteImage(url)).rejects.toThrow('Failed to delete image');
    });
  });

  describe('Session Blob Listing', () => {
    it('should list all blobs for a session', async () => {
      const sessionId = 'test-session';
      const mockBlobs = {
        blobs: [
          { url: 'https://blob.vercel-storage.com/1.jpg', pathname: 'sessions/test-session/user/1.jpg' },
          { url: 'https://blob.vercel-storage.com/2.jpg', pathname: 'sessions/test-session/garment/2.jpg' }
        ],
        cursor: null,
        hasMore: false
      };

      mockList.mockResolvedValue(mockBlobs as any);

      const result = await listSessionBlobs(sessionId);

      expect(mockList).toHaveBeenCalledWith({ prefix: `sessions/${sessionId}/` });
      expect(result).toEqual(mockBlobs);
    });
  });

  describe('Blob Metadata', () => {
    it('should retrieve metadata from KV cache', async () => {
      const url = 'https://blob.vercel-storage.com/test.jpg';
      const metadata = {
        sessionId: 'test-session',
        category: 'user',
        type: 'front',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + BLOB_EXPIRY_MS).toISOString()
      };

      mockKv.keys.mockResolvedValue(['blob:cleanup:test']);
      mockKv.get.mockResolvedValue({ url, metadata });

      const result = await getBlobMetadata(url);

      expect(result).toEqual(metadata);
    });

    it('should fallback to blob headers if not in cache', async () => {
      const url = 'https://blob.vercel-storage.com/test.jpg';
      
      mockKv.keys.mockResolvedValue([]);
      mockHead.mockResolvedValue({
        url,
        size: 2048,
        uploadedAt: new Date(),
        contentType: 'image/png'
      } as any);

      const result = await getBlobMetadata(url);

      expect(result).toMatchObject({
        mimeType: 'image/png',
        size: 2048
      });
      expect(mockHead).toHaveBeenCalledWith(url);
    });

    it('should return null if metadata not found', async () => {
      const url = 'https://blob.vercel-storage.com/nonexistent.jpg';
      
      mockKv.keys.mockResolvedValue([]);
      mockHead.mockRejectedValue(new Error('Not found'));

      const result = await getBlobMetadata(url);

      expect(result).toBeNull();
    });
  });

  describe('Cleanup Operations', () => {
    describe('cleanupExpiredBlobs', () => {
      it('should delete expired blobs', async () => {
        const expiredData = {
          url: 'https://blob.vercel-storage.com/expired.jpg',
          thumbnailUrl: 'https://blob.vercel-storage.com/expired_thumb.webp',
          expiresAt: new Date(Date.now() - 1000).toISOString() // Expired
        };

        const validData = {
          url: 'https://blob.vercel-storage.com/valid.jpg',
          expiresAt: new Date(Date.now() + 10000).toISOString() // Not expired
        };

        mockKv.keys.mockResolvedValue(['blob:cleanup:1', 'blob:cleanup:2']);
        mockKv.get
          .mockResolvedValueOnce(expiredData)
          .mockResolvedValueOnce(validData);

        const count = await cleanupExpiredBlobs();

        expect(count).toBe(1);
        expect(mockDel).toHaveBeenCalledWith(expiredData.url);
        expect(mockDel).toHaveBeenCalledWith(expiredData.thumbnailUrl);
        expect(mockDel).not.toHaveBeenCalledWith(validData.url);
        expect(mockKv.del).toHaveBeenCalledWith('blob:cleanup:1');
        expect(mockKv.del).not.toHaveBeenCalledWith('blob:cleanup:2');
      });

      it('should handle cleanup errors gracefully', async () => {
        mockKv.keys.mockRejectedValue(new Error('KV error'));

        const count = await cleanupExpiredBlobs();

        expect(count).toBe(0);
      });
    });

    describe('cleanupSessionBlobs', () => {
      it('should delete all blobs for a session', async () => {
        const sessionId = 'test-session';
        const mockBlobs = {
          blobs: [
            { url: 'https://blob.vercel-storage.com/1.jpg' },
            { url: 'https://blob.vercel-storage.com/2.jpg' }
          ]
        };

        mockList.mockResolvedValue(mockBlobs as any);
        mockKv.keys.mockResolvedValue([
          `blob:cleanup:${sessionId}:1`,
          `blob:cleanup:${sessionId}:2`
        ]);

        await cleanupSessionBlobs(sessionId);

        expect(mockList).toHaveBeenCalledWith({ prefix: `sessions/${sessionId}/` });
        expect(mockDel).toHaveBeenCalledWith('https://blob.vercel-storage.com/1.jpg');
        expect(mockDel).toHaveBeenCalledWith('https://blob.vercel-storage.com/2.jpg');
        expect(mockKv.del).toHaveBeenCalledTimes(3); // 2 cleanup keys + 1 session blob set
      });

      it('should handle session cleanup errors', async () => {
        const sessionId = 'test-session';
        mockList.mockRejectedValue(new Error('List failed'));

        await expect(cleanupSessionBlobs(sessionId)).rejects.toThrow();
      });
    });
  });

  describe('Secure URL Generation', () => {
    it('should generate secure URL with expiry', async () => {
      const url = 'https://blob.vercel-storage.com/test.jpg';
      const expiryMs = 3600000; // 1 hour

      const secureUrl = await generateSecureUrl(url, expiryMs);

      expect(secureUrl).toContain(url);
      expect(secureUrl).toContain('expires=');
      
      const urlObj = new URL(secureUrl);
      const expires = urlObj.searchParams.get('expires');
      expect(expires).toBeTruthy();
      
      const expiryTime = parseInt(expires!, 10);
      expect(expiryTime).toBeGreaterThan(Date.now());
      expect(expiryTime).toBeLessThanOrEqual(Date.now() + expiryMs);

      expect(mockKv.set).toHaveBeenCalled();
    });

    it('should use default expiry if not specified', async () => {
      const url = 'https://blob.vercel-storage.com/test.jpg';

      const secureUrl = await generateSecureUrl(url);

      const urlObj = new URL(secureUrl);
      const expires = urlObj.searchParams.get('expires');
      const expiryTime = parseInt(expires!, 10);
      
      // Default is 1 hour
      expect(expiryTime).toBeGreaterThan(Date.now() + 3500000);
      expect(expiryTime).toBeLessThanOrEqual(Date.now() + 3600000);
    });
  });

  describe('URL Validation', () => {
    it('should validate non-expired URLs', () => {
      const futureExpiry = Date.now() + 10000;
      const url = `https://blob.vercel-storage.com/test.jpg?expires=${futureExpiry}`;

      expect(validateSecureUrl(url)).toBe(true);
    });

    it('should reject expired URLs', () => {
      const pastExpiry = Date.now() - 10000;
      const url = `https://blob.vercel-storage.com/test.jpg?expires=${pastExpiry}`;

      expect(validateSecureUrl(url)).toBe(false);
    });

    it('should accept URLs without expiry', () => {
      const url = 'https://blob.vercel-storage.com/test.jpg';

      expect(validateSecureUrl(url)).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateSecureUrl('not-a-url')).toBe(false);
      expect(validateSecureUrl('')).toBe(false);
    });
  });

  describe('Configuration Constants', () => {
    it('should have correct blob expiry time', () => {
      expect(BLOB_EXPIRY_MS).toBe(30 * 60 * 1000); // 30 minutes
    });
  });
});