import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'STORAGE_ENDPOINT')
          return 'https://test.r2.cloudflarestorage.com';
        if (key === 'STORAGE_ACCESS_KEY_ID') return 'test-key';
        if (key === 'STORAGE_SECRET_ACCESS_KEY') return 'test-secret';
        if (key === 'STORAGE_BUCKET') return 'test-bucket';
        if (key === 'STORAGE_PUBLIC_URL') return 'https://pub-test.r2.dev';
        return undefined;
      }),
    };

    storageService = new StorageService(mockConfigService as ConfigService);
  });

  it('should be defined', () => {
    expect(storageService).toBeDefined();
  });

  it('should generate correct public URL using STORAGE_PUBLIC_URL', () => {
    const url = storageService.getPublicUrl(
      'catalogue/dishes/dish-1/test.webp',
    );
    expect(url).toBe(
      'https://pub-test.r2.dev/catalogue/dishes/dish-1/test.webp',
    );
  });

  it('should generate fallback URL using STORAGE_ENDPOINT if public URL is not set', () => {
    const fallbackConfigService: Partial<ConfigService> = {
      get: vi.fn((key: string) => {
        if (key === 'STORAGE_ENDPOINT')
          return 'https://test.r2.cloudflarestorage.com';
        if (key === 'STORAGE_BUCKET') return 'test-bucket';
        return undefined;
      }),
    };
    const svc = new StorageService(fallbackConfigService as ConfigService);
    const url = svc.getPublicUrl('catalogue/dishes/dish-1/test.webp');
    expect(url).toBe(
      'https://test.r2.cloudflarestorage.com/test-bucket/catalogue/dishes/dish-1/test.webp',
    );
  });

  it('should extract key from URL correctly', () => {
    const key = storageService.extractKeyFromUrl(
      'https://pub-test.r2.dev/catalogue/dishes/dish-1/test.webp',
    );
    expect(key).toBe('catalogue/dishes/dish-1/test.webp');
  });

  it('should mock upload successfully when s3Client is not configured', async () => {
    const unconfiguredConfigService: Partial<ConfigService> = {
      get: vi.fn(() => undefined),
    };
    const unconfiguredSvc = new StorageService(
      unconfiguredConfigService as ConfigService,
    );

    const result = await unconfiguredSvc.upload(
      {
        buffer: Buffer.from('test-image'),
        mimetype: 'image/webp',
        originalname: 'test.webp',
      },
      'catalogue/dishes/1/test.webp',
    );

    expect(result.key).toBe('catalogue/dishes/1/test.webp');
    expect(result.url).toBe(
      'https://storage.local/catalogue/catalogue/dishes/1/test.webp',
    );
  });

  it('should delete safely without throwing', async () => {
    // Mock s3Client.send
    // @ts-expect-error accessing private property for test mocking
    if (storageService.s3Client) {
      // @ts-expect-error accessing private property for test mocking
      vi.spyOn(storageService.s3Client, 'send').mockResolvedValueOnce(
        {} as never,
      );
    }
    await expect(
      storageService.delete('catalogue/dishes/1/test.webp'),
    ).resolves.not.toThrow();
  });
});
