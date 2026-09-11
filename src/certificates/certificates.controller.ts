import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { Role } from '../enums/role.enum';
import { RevokeCertificateDto } from './dto/revoke.dto';

@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  /**
   * Verificación pública: es el punto del código QR impreso en el certificado.
   * Cualquiera con el código puede comprobar su autenticidad, sin cuenta.
   */
  @Public()
  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  @Get('my')
  getMine(@CurrentUser('sub') userId: string) {
    return this.certificatesService.getMine(userId);
  }

  @Get('code/:code')
  getByCode(
    @Param('code') code: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.certificatesService.getByCode(code, userId, role);
  }

  // ─── Emisión y anulación ───────────────────────────────────────────────────

  @Post('issue/:courseId/student/:studentId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  issue(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser('sub') issuerId: string,
  ) {
    return this.certificatesService.issue(courseId, studentId, issuerId);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.certificatesService.findAll();
  }

  @Patch(':id/revoke')
  @Roles(Role.ADMIN)
  revoke(@Param('id') id: string, @Body() dto: RevokeCertificateDto) {
    return this.certificatesService.revoke(id, dto.reason);
  }
}
