import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export interface FileUploadPayload {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly publicUrl?: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const accessKeyId = this.configService.get<string>('STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'STORAGE_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('STORAGE_REGION') || 'auto';
    this.bucket =
      this.configService.get<string>('STORAGE_BUCKET') || 'catalogue';
    this.endpoint = endpoint;
    this.publicUrl = this.configService.get<string>('STORAGE_PUBLIC_URL');

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
    } else {
      this.logger.warn(
        'StorageService initialized without credentials. S3/R2 operations will be simulated in mock/test mode.',
      );
    }
  }

  /**
   * Upload a file buffer to S3-compatible storage (Cloudflare R2).
   */
  async upload(file: FileUploadPayload, key: string): Promise<UploadResult> {
    if (this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      await this.s3Client.send(command);
    } else {
      this.logger.log(`Storage mock upload simulated for key: ${key}`);
    }

    const url = this.getPublicUrl(key);
    return { key, url };
  }

  /**
   * Delete an object by key from S3-compatible storage.
   */
  async delete(key: string): Promise<void> {
    if (!key) return;
    if (this.s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
    } else {
      this.logger.log(`Storage mock delete simulated for key: ${key}`);
    }
  }

  /**
   * Resolve public access URL for an object key.
   */
  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    if (this.publicUrl) {
      const base = this.publicUrl.replace(/\/+$/, '');
      return `${base}/${cleanKey}`;
    }
    if (this.endpoint) {
      const base = this.endpoint.replace(/\/+$/, '');
      return `${base}/${this.bucket}/${cleanKey}`;
    }
    return `https://storage.local/${this.bucket}/${cleanKey}`;
  }

  /**
   * Helper to parse the object storage key from a public URL.
   */
  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const prefix = `/${this.bucket}/`;
      if (pathname.startsWith(prefix)) {
        return pathname.substring(prefix.length);
      }
      return pathname.replace(/^\/+/, '');
    } catch {
      return null;
    }
  }
}
