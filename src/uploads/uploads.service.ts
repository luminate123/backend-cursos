import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET', '');
    // Public base URL of the bucket (r2.dev or custom domain), no trailing slash
    this.publicUrl = config.get<string>('R2_PUBLIC_URL', '').replace(/\/$/, '');

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicUrl) {
      throw new InternalServerErrorException('R2 storage is not configured');
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  // Returns a presigned PUT url the browser uploads to directly, plus the
  // public url to store in the lesson resource.
  async presign(filename: string, contentType: string) {
    const safeName = filename.replace(/[^\w.-]/g, '_').slice(-100);
    const key = `resources/${randomUUID()}-${safeName}`;

    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );

    return { uploadUrl, publicUrl: `${this.publicUrl}/${key}`, key };
  }
}
