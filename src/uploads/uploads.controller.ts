import { Controller, Post, Delete, Body, HttpCode } from '@nestjs/common';
import { IsString, IsUrl } from 'class-validator';
import { UploadsService } from './uploads.service';
import { PresignDto, PresignReceiptDto } from './dto/presign.dto';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Requester } from '../common/course-access.service';

class DeleteUploadDto {
  @IsString()
  @IsUrl()
  url: string;
}

@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  // Instructor/Admin: get a presigned URL to upload a downloadable resource
  @Post('presign')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  presign(@Body() dto: PresignDto, @CurrentUser('sub') userId: string) {
    return this.uploadsService.presign(dto.filename, dto.contentType, userId);
  }

  // Cualquier usuario autenticado: subir el comprobante de su propio pago.
  // No devuelve URL pública, solo la key (ver UploadsService.presignReceipt).
  @Post('presign/receipt')
  presignReceipt(@Body() dto: PresignReceiptDto, @CurrentUser('sub') userId: string) {
    return this.uploadsService.presignReceipt(dto.filename, dto.contentType, dto.size, userId);
  }

  // Instructor/Admin: delete an uploaded resource from R2 (uploader or admin only)
  @Delete()
  @HttpCode(204)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  remove(@Body() dto: DeleteUploadDto, @CurrentUser() user: Requester) {
    return this.uploadsService.deleteByUrl(dto.url, user);
  }
}
