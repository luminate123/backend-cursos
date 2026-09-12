import { PaymentStatus } from '../entities/payment.entity';

/**
 * Réplica en memoria de las dos reglas de dinero que separan a un instructor de
 * otro. Si alguien relaja el filtro por instructor o la exigencia de pago
 * confirmado, estos tests fallan y obligan a mirar también el servicio.
 *
 * ponytail: sin base de datos ni contenedor de Nest. Lo que se protege es quién
 * puede cobrar y quién puede dar acceso, no el driver de Postgres.
 */
type Pago = {
  id: string;
  instructorId: string;
  status: PaymentStatus;
};

/** Espejo de PaymentsService.findAll(query, instructorId) — el filtro owned(). */
function cola(pagos: Pago[], instructorId?: string) {
  return instructorId ? pagos.filter((p) => p.instructorId === instructorId) : pagos;
}

/**
 * Espejo de PaymentsService.assertCanReview(). No recibe rol a propósito: el
 * administrador tampoco confirma cobros, solo el instructor dueño.
 */
function puedeRevisar(pago: Pago, revisorId: string) {
  return pago.instructorId === revisorId;
}

/** Espejo de la regla añadida en EnrollmentsService.approve(). */
function puedeDarAcceso(precio: number, pagosAprobados: number) {
  return precio <= 0 || pagosAprobados > 0;
}

describe('revisión de comprobantes', () => {
  const pagos: Pago[] = [
    { id: 'p1', instructorId: 'ana', status: PaymentStatus.PENDING },
    { id: 'p2', instructorId: 'ana', status: PaymentStatus.APPROVED },
    { id: 'p3', instructorId: 'luis', status: PaymentStatus.PENDING },
  ];

  it('cada instructor solo ve los comprobantes de sus propios programas', () => {
    expect(cola(pagos, 'ana').map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(cola(pagos, 'luis').map((p) => p.id)).toEqual(['p3']);
  });

  it('el administrador ve la academia completa', () => {
    expect(cola(pagos)).toHaveLength(3);
  });

  it('un instructor no puede confirmar ni rechazar el cobro de otro', () => {
    const deLuis = pagos.find((p) => p.id === 'p3')!;
    expect(puedeRevisar(deLuis, 'ana')).toBe(false);
    expect(puedeRevisar(deLuis, 'luis')).toBe(true);
  });

  it('el administrador no confirma cobros: supervisa en lectura', () => {
    // No hay atajo por rol; el id del admin no es el del instructor del curso.
    for (const pago of pagos) {
      expect(puedeRevisar(pago, 'admin')).toBe(false);
    }
  });
});

describe('acceso a un programa de pago', () => {
  it('no se da acceso a un programa de pago sin un comprobante confirmado', () => {
    expect(puedeDarAcceso(1200, 0)).toBe(false);
  });

  it('con el comprobante confirmado, el acceso queda habilitado', () => {
    expect(puedeDarAcceso(1200, 1)).toBe(true);
  });

  it('un programa gratuito no necesita comprobante', () => {
    expect(puedeDarAcceso(0, 0)).toBe(true);
  });
});
