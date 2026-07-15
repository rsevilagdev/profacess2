const CURITIBA_TZ = 'America/Sao_Paulo';

/**
 * Returns a Date object whose values reflect Curitiba local time,
 * regardless of the user's device timezone.
 */
export function getCuritibaNow() {
  const now = new Date();
  const str = now.toLocaleString('en-US', { timeZone: CURITIBA_TZ });
  return new Date(str);
}

/**
 * Returns an ISO string representing the current Curitiba date/time.
 * Use this for all database timestamp fields.
 */
export function getCuritibaISO() {
  return new Date().toISOString();
}

/**
 * Returns formatted time "HH:mm" in Curitiba timezone.
 */
export function getCuritibaTime() {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: CURITIBA_TZ, hour: '2-digit', minute: '2-digit' });
}

/**
 * Returns formatted date+time "dd/mm/yyyy HH:mm" in Curitiba timezone.
 */
export function getCuritibaDateTime() {
  return new Date().toLocaleString('pt-BR', { timeZone: CURITIBA_TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Returns the current hour (0-23) in Curitiba timezone.
 */
export function getCuritibaHour() {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: CURITIBA_TZ, hour: 'numeric', hour12: false }));
}

/**
 * Returns the current minute (0-59) in Curitiba timezone.
 */
export function getCuritibaMinute() {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: CURITIBA_TZ, minute: 'numeric' }));
}

/**
 * Formats any date string/Date object to Curitiba timezone display.
 */
export function formatCuritiba(dateStr, options = {}) {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return d.toLocaleString('pt-BR', { timeZone: CURITIBA_TZ, ...options });
}