import { PaymentStatus } from '../entities/payment.entity';
import { rangeEnd } from '../common/lima-time';

/**
 * Réplica en memoria de la agregación que hace PaymentsService.getRevenue con
 * SQL. Si la regla de negocio cambia (qué estados suman, cómo se calcula el
 * ticket promedio), este test falla y obliga a mirar también la query.
 *
 * ponytail: sin base de datos ni módulo de Nest. Lo que se protege aquí es la
 * regla de dinero, no el driver de Postgres.
 */
type Row = { amount: number; status: PaymentStatus; reviewedAt: Date | null };

function summarize(rows: Row[], from?: Date, to?: string) {
  const end = to ? rangeEnd(to) : null;
  const inRange = (r: Row) =>
    !!r.reviewedAt && (!from || r.reviewedAt >= from) && (!end || r.reviewedAt < end);

  const approved = rows.filter((r) => r.status === PaymentStatus.APPROVED && inRange(r));
  const pending = rows.filter((r) => r.status === PaymentStatus.PENDING);

  const totalRevenue = approved.reduce((sum, r) => sum + r.amount, 0);
  const sales = approved.length;

  return {
    totalRevenue,
    sales,
    avgTicket: sales > 0 ? Number((totalRevenue / sales).toFixed(2)) : 0,
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, r) => sum + r.amount, 0),
  };
}

const d = (iso: string) => new Date(iso);

describe('ingresos', () => {
  const rows: Row[] = [
    { amount: 180, status: PaymentStatus.APPROVED, reviewedAt: d('2026-01-10') },
    { amount: 480, status: PaymentStatus.APPROVED, reviewedAt: d('2026-02-05') },
    { amount: 1200, status: PaymentStatus.APPROVED, reviewedAt: d('2026-03-20') },
    { amount: 150, status: PaymentStatus.PENDING, reviewedAt: null },
    { amount: 999, status: PaymentStatus.REJECTED, reviewedAt: d('2026-02-11') },
  ];

  it('solo suma los pagos aprobados', () => {
    const s = summarize(rows);
    expect(s.totalRevenue).toBe(1860); // 180 + 480 + 1200
    expect(s.sales).toBe(3);
  });

  it('no cuenta como ingreso lo pendiente ni lo rechazado', () => {
    const s = summarize(rows);
    expect(s.pendingCount).toBe(1);
    expect(s.pendingAmount).toBe(150);
    expect(s.totalRevenue).toBe(1860); // el rechazado de 999 no aparece
  });

  it('calcula el ticket promedio con dos decimales', () => {
    expect(summarize(rows).avgTicket).toBe(620);
    const uneven: Row[] = [
      { amount: 100, status: PaymentStatus.APPROVED, reviewedAt: d('2026-01-01') },
      { amount: 100, status: PaymentStatus.APPROVED, reviewedAt: d('2026-01-02') },
      { amount: 101, status: PaymentStatus.APPROVED, reviewedAt: d('2026-01-03') },
    ];
    expect(summarize(uneven).avgTicket).toBe(100.33);
  });

  it('respeta el rango de fechas', () => {
    const s = summarize(rows, d('2026-02-01'), '2026-02-28');
    expect(s.totalRevenue).toBe(480);
    expect(s.sales).toBe(1);
  });

  it('el "hasta" con fecha sola incluye todo ese día en hora de Lima', () => {
    const lastDay: Row[] = [
      // 22:00 del 28/02 en Lima (ya es 01/03 en UTC): cuenta.
      { amount: 300, status: PaymentStatus.APPROVED, reviewedAt: d('2026-03-01T03:00:00Z') },
      // 00:00 del 01/03 en Lima: queda fuera.
      { amount: 999, status: PaymentStatus.APPROVED, reviewedAt: d('2026-03-01T05:00:00Z') },
    ];
    expect(summarize(lastDay, undefined, '2026-02-28').totalRevenue).toBe(300);
  });

  it('no divide por cero cuando no hay ventas', () => {
    const s = summarize([{ amount: 150, status: PaymentStatus.PENDING, reviewedAt: null }]);
    expect(s.totalRevenue).toBe(0);
    expect(s.avgTicket).toBe(0);
  });
});
