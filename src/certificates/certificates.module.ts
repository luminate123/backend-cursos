import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { Certificate } from '../entities/certificate.entity';
import { Enrollment } from '../entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, Enrollment])],
  controllers: [CertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
