import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import {
  Certificate,
  CertificateType,
  resolveCertificateType,
} from '../entities/certificate.entity';
import { Enrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { Role } from '../enums/role.enum';

// Sin I, O, 0 ni 1: el código se dicta por teléfono y se copia a mano.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private config: ConfigService,
  ) {}

  /**
   * Emite el certificado de una inscripción completada.
   * Idempotente: si ya existe, devuelve el mismo en lugar de emitir otro.
   */
  async issue(courseId: string, studentId: string, issuerId: string): Promise<Certificate> {
    const existing = await this.certificateRepository.findOne({
      where: { userId: studentId, courseId },
    });
    if (existing) return existing;

    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId: studentId, courseId },
      relations: ['user', 'course'],
    });
    if (!enrollment) throw new NotFoundException('El alumno no está inscrito en este programa');
    if (enrollment.status !== EnrollmentStatus.APPROVED) {
      throw new ConflictException('La inscripción no está aprobada');
    }
    if (enrollment.progressPercentage < 100) {
      throw new ConflictException(
        `El programa está al ${enrollment.progressPercentage}%: aún no se puede certificar`,
      );
    }

    const { user, course } = enrollment;

    return this.certificateRepository.save(
      this.certificateRepository.create({
        code: await this.generateCode(),
        userId: studentId,
        courseId,
        // Datos congelados al momento de emitir.
        studentName: `${user.firstName} ${user.lastName}`.trim(),
        courseTitle: course.title,
        academicHours: course.academicHours,
        competencies: course.competencies ?? [],
        type: resolveCertificateType(course.level, course.hasFormalEvaluation),
      }),
    );
  }

  /** Certificados del alumno, con el enlace de verificación de cada uno. */
  async getMine(userId: string) {
    const certificates = await this.certificateRepository.find({
      where: { userId },
      order: { issuedAt: 'DESC' },
    });
    return certificates.map((c) => this.withVerifyUrl(c));
  }

  async getByCode(code: string, requesterId: string, requesterRole: Role) {
    const certificate = await this.certificateRepository.findOne({
      where: { code: code.toUpperCase() },
    });
    if (!certificate) throw new NotFoundException('Certificado no encontrado');
    if (requesterRole !== Role.ADMIN && certificate.userId !== requesterId) {
      throw new ForbiddenException('Este certificado no es tuyo');
    }
    return this.withVerifyUrl(certificate);
  }

  /**
   * Verificación pública. Devuelve solo lo que un tercero necesita para
   * confirmar que el certificado es auténtico: nada de ids internos ni correo
   * del alumno.
   */
  async verify(code: string) {
    const certificate = await this.certificateRepository.findOne({
      where: { code: code.trim().toUpperCase() },
    });
    if (!certificate) throw new NotFoundException('No existe un certificado con ese código');

    return {
      valid: !certificate.revokedAt,
      code: certificate.code,
      studentName: certificate.studentName,
      courseTitle: certificate.courseTitle,
      academicHours: certificate.academicHours,
      competencies: certificate.competencies ?? [],
      type: certificate.type,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
    };
  }

  async revoke(id: string, reason: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({ where: { id } });
    if (!certificate) throw new NotFoundException('Certificado no encontrado');
    if (certificate.revokedAt) throw new ConflictException('El certificado ya está anulado');

    certificate.revokedAt = new Date();
    certificate.revokedReason = reason;
    return this.certificateRepository.save(certificate);
  }

  /** Listado para administración. */
  findAll() {
    return this.certificateRepository.find({
      order: { issuedAt: 'DESC' },
      take: 200,
    });
  }

  private withVerifyUrl(certificate: Certificate) {
    const base = this.config.get<string>('FRONTEND_URL', '').replace(/\/$/, '');
    return {
      ...certificate,
      verifyUrl: `${base}/verificar/${certificate.code}`,
    };
  }

  /**
   * Código con formato KORE-<año>-XXXXXX. Reintenta ante colisión en vez de
   * confiar en la suerte: la columna es única y el insert fallaría.
   */
  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 10; attempt++) {
      let suffix = '';
      for (let i = 0; i < 6; i++) {
        suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      const code = `KORE-${year}-${suffix}`;
      const taken = await this.certificateRepository.findOne({ where: { code } });
      if (!taken) return code;
    }
    throw new ConflictException('No se pudo generar un código único, intenta de nuevo');
  }
}
