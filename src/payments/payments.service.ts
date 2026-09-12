import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { Enrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { Course } from '../entities/course.entity';
import { Role } from '../enums/role.enum';
import { UploadsService } from '../uploads/uploads.service';
import { CheckoutDto, QueryPaymentsDto, QueryRevenueDto } from './dto/checkout.dto';
import { parseLima, rangeEnd } from '../common/lima-time';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectDataSource()
    private dataSource: DataSource,
    private uploads: UploadsService,
    private config: ConfigService,
  ) {}

  /** Datos de cobro. Van en env: son dos cuentas fijas, no un CRUD. */
  getBankInfo() {
    return {
      holder: this.config.get<string>('KORE_BANK_HOLDER', 'Kore Group S.A.C.'),
      bank: this.config.get<string>('KORE_BANK_NAME', 'BCP'),
      currency: 'PEN',
      accounts: [
        {
          type: 'BCP_SOLES' as const,
          label: 'Cuenta corriente BCP soles',
          number: this.config.get<string>('KORE_BANK_ACCOUNT', ''),
        },
        {
          type: 'INTERBANK' as const,
          label: 'Cuenta interbancaria (CCI)',
          number: this.config.get<string>('KORE_BANK_CCI', ''),
        },
      ].filter((a) => a.number),
    };
  }

  /**
   * Inscripción con pago: crea (o reactiva) el enrollment en PENDING y registra
   * el comprobante, en una sola transacción. Un endpoint y no dos, para que no
   * queden inscripciones huérfanas sin comprobante ni comprobantes sin inscripción.
   */
  async checkout(courseId: string, userId: string, dto: CheckoutDto): Promise<Payment> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Curso no encontrado');
    if (!course.isPublished) throw new ForbiddenException('El curso no está publicado');
    if (course.instructorId === userId) {
      throw new ForbiddenException('No puedes inscribirte en tu propio curso');
    }
    if (Number(course.price) <= 0) {
      throw new BadRequestException(
        'Este programa es gratuito: usa la inscripción directa, sin comprobante',
      );
    }

    // La key tiene que ser del propio alumno: sin esto, cualquiera podría
    // adjuntar el comprobante de otra persona pasando su key.
    if (!dto.receiptKey.startsWith(`receipts/${userId}/`)) {
      throw new ForbiddenException('El comprobante no corresponde a este usuario');
    }
    if (!(await this.uploads.objectExists(dto.receiptKey))) {
      throw new BadRequestException('El comprobante no se subió correctamente');
    }

    return this.dataSource.transaction(async (manager) => {
      const enrollments = manager.getRepository(Enrollment);
      const payments = manager.getRepository(Payment);

      let enrollment = await enrollments.findOne({ where: { userId, courseId } });

      if (enrollment?.status === EnrollmentStatus.APPROVED) {
        throw new ConflictException('Ya estás inscrito en este programa');
      }

      if (!enrollment) {
        enrollment = await enrollments.save(
          enrollments.create({ userId, courseId, status: EnrollmentStatus.PENDING }),
        );
      } else if (enrollment.status === EnrollmentStatus.REJECTED) {
        // Reintento tras rechazo: vuelve a revisión con el historial limpio.
        enrollment.status = EnrollmentStatus.PENDING;
        enrollment.rejectionReason = null;
        enrollment.reviewedBy = null;
        enrollment.reviewedAt = null;
        enrollment = await enrollments.save(enrollment);
      }

      const pending = await payments.findOne({
        where: { enrollmentId: enrollment.id, status: PaymentStatus.PENDING },
      });
      if (pending) {
        throw new ConflictException('Ya tienes un comprobante en revisión para este programa');
      }

      return payments.save(
        payments.create({
          enrollmentId: enrollment.id,
          amount: Number(course.price),
          currency: 'PEN',
          method: dto.method ?? PaymentMethod.BCP_SOLES,
          receiptKey: dto.receiptKey,
          operationNumber: dto.operationNumber ?? null,
          declaredPaidAt: dto.declaredPaidAt ? parseLima(dto.declaredPaidAt) : null,
          status: PaymentStatus.PENDING,
        }),
      );
    });
  }

  /** Pagos del alumno, con el curso al que corresponden. */
  getMyPayments(userId: string) {
    return this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.enrollment', 'enrollment')
      .innerJoin('enrollment.course', 'course')
      .where('enrollment.userId = :userId', { userId })
      .select([
        'payment.id', 'payment.amount', 'payment.currency', 'payment.method',
        'payment.operationNumber', 'payment.declaredPaidAt', 'payment.status',
        'payment.rejectionReason', 'payment.reviewedAt', 'payment.createdAt',
        'enrollment.id', 'enrollment.status',
        'course.id', 'course.title', 'course.slug', 'course.thumbnail',
      ])
      .orderBy('payment.createdAt', 'DESC')
      .getMany();
  }

  /** Cola de revisión del administrador. */
  async findAll(query: QueryPaymentsDto) {
    const page = Math.max(1, parseInt(query.page || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20') || 20));

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.enrollment', 'enrollment')
      .innerJoin('enrollment.course', 'course')
      .innerJoin('enrollment.user', 'student')
      .leftJoin('payment.reviewer', 'reviewer')
      .select([
        'reviewer.id', 'reviewer.firstName', 'reviewer.lastName',
        'payment.id', 'payment.amount', 'payment.currency', 'payment.method',
        'payment.operationNumber', 'payment.declaredPaidAt', 'payment.status',
        'payment.rejectionReason', 'payment.reviewedAt', 'payment.createdAt',
        'enrollment.id', 'enrollment.status',
        'course.id', 'course.title', 'course.slug', 'course.price',
        'student.id', 'student.firstName', 'student.lastName', 'student.email',
      ])
      .orderBy('payment.createdAt', 'ASC') // los más antiguos esperan más
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('payment.status = :status', { status: query.status });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, lastPage: Math.ceil(total / limit) } };
  }

  /**
   * URL temporal para ver el comprobante. Solo el alumno dueño del pago o un
   * administrador: el archivo nunca es público.
   */
  async getReceiptUrl(paymentId: string, requesterId: string, requesterRole: Role) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['enrollment'],
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    if (requesterRole !== Role.ADMIN && payment.enrollment.userId !== requesterId) {
      throw new ForbiddenException('No puedes ver este comprobante');
    }

    return { url: await this.uploads.presignGet(payment.receiptKey), expiresInSeconds: 300 };
  }

  /**
   * Aprueba el pago y con él la inscripción, en una transacción.
   * Idempotente: solo un pago en PENDING pasa a APPROVED, así que un doble
   * clic no puede contar el ingreso dos veces.
   */
  async approve(paymentId: string, adminId: string): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(Payment);
      const payment = await payments.findOne({
        where: { id: paymentId },
        relations: ['enrollment'],
      });
      if (!payment) throw new NotFoundException('Pago no encontrado');
      if (payment.status !== PaymentStatus.PENDING) {
        throw new ConflictException(`El pago ya fue ${payment.status.toLowerCase()}`);
      }

      payment.status = PaymentStatus.APPROVED;
      payment.reviewedBy = adminId;
      payment.reviewedAt = new Date();
      payment.rejectionReason = null;
      await payments.save(payment);

      const enrollments = manager.getRepository(Enrollment);
      const enrollment = payment.enrollment;
      if (enrollment.status !== EnrollmentStatus.APPROVED) {
        enrollment.status = EnrollmentStatus.APPROVED;
        enrollment.rejectionReason = null;
        enrollment.reviewedBy = adminId;
        enrollment.reviewedAt = new Date();
        await enrollments.save(enrollment);
        await manager
          .getRepository(Course)
          .increment({ id: enrollment.courseId }, 'enrollmentCount', 1);
      }

      return payment;
    });
  }

  /** Rechaza el comprobante. La inscripción queda PENDING para reintentar. */
  async reject(paymentId: string, adminId: string, reason: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`El pago ya fue ${payment.status.toLowerCase()}`);
    }

    payment.status = PaymentStatus.REJECTED;
    payment.reviewedBy = adminId;
    payment.reviewedAt = new Date();
    payment.rejectionReason = reason;
    return this.paymentRepository.save(payment);
  }

  /**
   * Ingresos por venta de programas. Solo cuentan los pagos aprobados.
   *
   * Con `instructorId` devuelve solo lo generado por los programas de ese
   * instructor: es el mismo cálculo, acotado a sus cursos. Sin él es la vista
   * general del administrador, que además trae el desglose por instructor.
   *
   * ponytail: se agrega en vivo con SUM sobre `payments`; si el volumen pasa de
   * decenas de miles de pagos, materializar una tabla de totales por mes.
   */
  /**
   * Acota una query de pagos a los programas de un instructor. Alias propios
   * (`ownEnrollment`/`ownCourse`) para poder aplicarse también sobre queries que
   * ya unieron `enrollment`/`course` por su cuenta.
   */
  private owned(qb: SelectQueryBuilder<Payment>, instructorId?: string) {
    if (!instructorId) return qb;
    return qb
      .innerJoin('payment.enrollment', 'ownEnrollment')
      .innerJoin('ownEnrollment.course', 'ownCourse')
      .andWhere('ownCourse.instructorId = :instructorId', { instructorId });
  }

  async getRevenue(query: QueryRevenueDto, instructorId?: string) {
    const from = query.from ? parseLima(query.from) : null;
    const to = query.to ? rangeEnd(query.to) : null;

    // Acota al rango de fechas pedido. Se aplica sobre reviewedAt: la fecha en
    // que el ingreso se reconoció, no la de creación del comprobante.
    // El filtro por instructor va aquí también: si se olvidara en una sola de
    // las queries, ese instructor vería dinero de otro.
    const scoped = (qb: SelectQueryBuilder<Payment>) => {
      if (from) qb.andWhere('payment.reviewedAt >= :from', { from });
      if (to) qb.andWhere('payment.reviewedAt < :to', { to });
      return this.owned(qb, instructorId);
    };

    const totalsRow = await scoped(
      this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :approved', { approved: PaymentStatus.APPROVED }),
    )
      .select('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'sales')
      .getRawOne<{ revenue: string; sales: string }>();

    // Lo pendiente no lleva rango de fechas (todavía no tiene reviewedAt), pero
    // sí el filtro por instructor.
    const pendingRow = await this.owned(
      this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :pending', { pending: PaymentStatus.PENDING }),
      instructorId,
    )
      .select('COALESCE(SUM(payment.amount), 0)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .getRawOne<{ amount: string; count: string }>();

    const series = await scoped(
      this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :approved', { approved: PaymentStatus.APPROVED }),
    )
      .select("TO_CHAR(DATE_TRUNC('month', payment.reviewedAt), 'YYYY-MM')", 'period')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'sales')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany<{ period: string; revenue: string; sales: string }>();

    const byCourse = await scoped(
      this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin('payment.enrollment', 'enrollment')
        .innerJoin('enrollment.course', 'course')
        .where('payment.status = :approved', { approved: PaymentStatus.APPROVED }),
    )
      .select('course.id', 'courseId')
      .addSelect('course.title', 'title')
      .addSelect('course.line', 'line')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'sales')
      .groupBy('course.id')
      .addGroupBy('course.title')
      .addGroupBy('course.line')
      .orderBy('revenue', 'DESC')
      .getRawMany<{ courseId: string; title: string; line: string; revenue: string; sales: string }>();

    // Desglose por instructor: solo tiene sentido en la vista general del
    // admin. Un instructor ya está mirando una sola columna, la suya.
    const byInstructor = instructorId
      ? []
      : await scoped(
          this.paymentRepository
            .createQueryBuilder('payment')
            .innerJoin('payment.enrollment', 'enrollment')
            .innerJoin('enrollment.course', 'course')
            .innerJoin('course.instructor', 'instructor')
            .where('payment.status = :approved', { approved: PaymentStatus.APPROVED }),
        )
          .select('instructor.id', 'instructorId')
          .addSelect('instructor.firstName', 'firstName')
          .addSelect('instructor.lastName', 'lastName')
          .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
          .addSelect('COUNT(*)', 'sales')
          .addSelect('COUNT(DISTINCT course.id)', 'courses')
          .groupBy('instructor.id')
          .addGroupBy('instructor.firstName')
          .addGroupBy('instructor.lastName')
          .orderBy('revenue', 'DESC')
          .getRawMany<{
            instructorId: string;
            firstName: string;
            lastName: string;
            revenue: string;
            sales: string;
            courses: string;
          }>();

    const revenue = Number(totalsRow?.revenue ?? 0);
    const sales = Number(totalsRow?.sales ?? 0);

    return {
      currency: 'PEN',
      totalRevenue: revenue,
      sales,
      avgTicket: sales > 0 ? Number((revenue / sales).toFixed(2)) : 0,
      pendingCount: Number(pendingRow?.count ?? 0),
      pendingAmount: Number(pendingRow?.amount ?? 0),
      series: series.map((r) => ({
        period: r.period,
        revenue: Number(r.revenue),
        sales: Number(r.sales),
      })),
      byCourse: byCourse.map((r) => ({
        courseId: r.courseId,
        title: r.title,
        line: r.line,
        revenue: Number(r.revenue),
        sales: Number(r.sales),
      })),
      byInstructor: byInstructor.map((r) => ({
        instructorId: r.instructorId,
        name: `${r.firstName} ${r.lastName}`,
        revenue: Number(r.revenue),
        sales: Number(r.sales),
        courses: Number(r.courses),
      })),
    };
  }
}
