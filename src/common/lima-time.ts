// Toda la plataforma trabaja en hora de Perú. Perú no tiene horario de verano:
// UTC−5 fijo todo el año, por eso el offset puede ir escrito.
export const LIMA_TZ = 'America/Lima';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha sola (YYYY-MM-DD, lo que manda un <input type="date">) = medianoche de Lima. */
export function parseLima(value: string): Date {
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00-05:00` : value);
}

/** Límite superior exclusivo de un filtro "hasta": con fecha sola, incluye todo ese día en Lima. */
export function rangeEnd(to: string): Date {
  const end = parseLima(to);
  end.setTime(end.getTime() + (DATE_ONLY.test(to) ? 86_400_000 : 1));
  return end;
}
