import { CourseLevel } from '../entities/course.entity';
import { CertificateType, resolveCertificateType } from '../entities/certificate.entity';

/**
 * resolveCertificateType es la regla del modelo de certificación del plan
 * estratégico. Lo que se protege aquí es que "certificación de competencias"
 * nunca se emita sin una evaluación formal que la sustente.
 */
describe('resolveCertificateType', () => {
  it('Essentials sin evaluación emite constancia de participación', () => {
    expect(resolveCertificateType(CourseLevel.ESSENTIALS, false)).toBe(
      CertificateType.PARTICIPACION,
    );
  });

  it('Essentials con evaluación emite constancia de aprobación', () => {
    expect(resolveCertificateType(CourseLevel.ESSENTIALS, true)).toBe(
      CertificateType.APROBACION,
    );
  });

  it('Professional emite certificado de especialización', () => {
    expect(resolveCertificateType(CourseLevel.PROFESSIONAL, false)).toBe(
      CertificateType.ESPECIALIZACION,
    );
    expect(resolveCertificateType(CourseLevel.PROFESSIONAL, true)).toBe(
      CertificateType.ESPECIALIZACION,
    );
  });

  it('Advanced solo certifica competencias si hay evaluación formal', () => {
    expect(resolveCertificateType(CourseLevel.ADVANCED, true)).toBe(
      CertificateType.COMPETENCIAS,
    );
    // Sin evaluación se degrada: no se puede afirmar una competencia sin medirla.
    expect(resolveCertificateType(CourseLevel.ADVANCED, false)).toBe(
      CertificateType.APROBACION,
    );
  });

  it('Executive emite certificado ejecutivo', () => {
    expect(resolveCertificateType(CourseLevel.EXECUTIVE, false)).toBe(
      CertificateType.EJECUTIVO,
    );
  });

  it('COMPETENCIAS nunca sale de un programa sin evaluación formal', () => {
    const sinEvaluacion = Object.values(CourseLevel).map((level) =>
      resolveCertificateType(level, false),
    );
    expect(sinEvaluacion).not.toContain(CertificateType.COMPETENCIAS);
  });
});
