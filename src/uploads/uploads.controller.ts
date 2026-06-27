import { Controller, Post, Delete, Body, HttpCode } from '@nestjs/common';
import { IsString, IsUrl } from 'class-validator';
import { UploadsService } from './uploads.service';
import { PresignDto } from './dto/presign.dto';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

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
  presign(@Body() dto: PresignDto) {
    return this.uploadsService.presign(dto.filename, dto.contentType);
  }

  // Instructor/Admin: delete an uploaded resource from R2
  @Delete()
  @HttpCode(204)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  remove(@Body() dto: DeleteUploadDto) {
    return this.uploadsService.deleteByUrl(dto.url);
  }
}
