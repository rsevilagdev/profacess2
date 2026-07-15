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
export function parseUTC(dateStr) {
  if (!dateStr) return new Date();
  if (typeof dateStr !== 'string') return dateStr;
  const hasTZ = dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr);
  return new Date(hasTZ ? dateStr : dateStr + 'Z');
}

export function formatCuritiba(dateStr, options = {}) {
  if (!dateStr) return '';
  const d = parseUTC(dateStr);
  return d.toLocaleString('pt-BR', { timeZone: CURITIBA_TZ, ...options });
}

/**
 * Returns an ISO string for 6 months from now — used for vehicle/driver validity.
 */
export function getSixMonthsFromNow() {
  const now = new Date();
  const future = new Date(now);
  future.setMonth(future.getMonth() + 6);
  return future.toISOString();
}

/**
 * Returns an ISO string for 6 months after the given date.
 */
export function getSixMonthsFromDate(dateStr) {
  const base = dateStr ? parseUTC(dateStr) : new Date();
  const future = new Date(base);
  future.setMonth(future.getMonth() + 6);
  return future.toISOString();
}