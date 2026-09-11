import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { MAX_RECEIPT_BYTES } from './dto/presign.dto';

// La firma se calcula localmente: no hace falta R2 real.
const config = {
  get: (key: string, def?: string) =>
    ({
      R2_ACCOUNT_ID: 'acc',
      R2_ACCESS_KEY_ID: 'id',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET: 'bucket',
      R2_PUBLIC_URL: 'https://cdn.example.com',
    })[key] ?? def,
} as unknown as ConfigService;

describe('presignReceipt size limit', () => {
  const service = new UploadsService(config);

  it('firma el Content-Length del comprobante', async () => {
    const { uploadUrl } = await service.presignReceipt('v.png', 'image/png', 1234, 'u1');
    const signed = new URL(uploadUrl).searchParams.get('X-Amz-SignedHeaders');
    expect(signed?.split(';')).toContain('content-length');
  });

  it('rechaza comprobantes de más de 10 MB', async () => {
    await expect(
      service.presignReceipt('v.png', 'image/png', MAX_RECEIPT_BYTES + 1, 'u1'),
    ).rejects.toThrow(BadRequestException);
  });
});
