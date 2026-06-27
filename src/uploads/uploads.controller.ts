import { Controller, Post, Body } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { PresignDto } from './dto/presign.dto';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  // Instructor/Admin: get a presigned URL to upload a downloadable resource
  @Post('presign')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  presign(@Body() dto: PresignDto) {
    return this.uploadsService.presign(dto.filename, dto.contentType);
  }
}
