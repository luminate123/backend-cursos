import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Role } from '../enums/role.enum';
import type { Requester } from '../common/course-access.service';

// Allowlist of downloadable material types. Excludes html/svg/js and other
// renderable/executable types to prevent stored XSS on the public bucket domain.
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // generic binary (some browsers report this for .zip); served as attachment
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

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
  // public url to store in the lesson resource. Keys are namespaced per user
  // so deletes can be authorized by ownership without a separate table.
  async presign(filename: string, contentType: string, userId: string) {
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException('Tipo de archivo no permitido');
    }
    const safeName = filename.replace(/[^\w.-]/g, '_').slice(-100);
    const key = `resources/${userId}/${randomUUID()}-${safeName}`;

    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );

    return { uploadUrl, publicUrl: `${this.publicUrl}/${key}`, key };
  }

  // Deletes an object from R2 given its public url. No-ops for urls outside
  // our bucket (e.g. external links). When a requester is given, only the
  // uploader (key prefix resources/<userId>/) or an admin may delete; called
  // without a requester for trusted server-side cleanup (e.g. lesson delete).
  async deleteByUrl(url: string, requester?: Requester): Promise<void> {
    if (!url.startsWith(`${this.publicUrl}/`)) return;
    const key = url.slice(this.publicUrl.length + 1);
    if (!key) return;

    if (requester && requester.role !== Role.ADMIN) {
      if (!key.startsWith(`resources/${requester.sub}/`)) {
        throw new ForbiddenException('No puedes eliminar este archivo');
      }
    }

    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
