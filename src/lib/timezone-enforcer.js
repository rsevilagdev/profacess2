/**
 * Timezone Enforcer — patches native Date methods to default to America/Sao_Paulo.
 * Ensures all date/time display is consistent regardless of the user's device timezone.
 * Called once on app load after user authentication.
 */

const SYSTEM_TIMEZONE = 'America/Sao_Paulo';
let _enforced = false;

export function enforceSystemTimezone() {
  if (_enforced) return;
  _enforced = true;

  const origToLocaleString = Date.prototype.toLocaleString;
  const origToLocaleDateString = Date.prototype.toLocaleDateString;
  const origToLocaleTimeString = Date.prototype.toLocaleTimeString;

  Date.prototype.toLocaleString = function (locale, options = {}) {
    return origToLocaleString.call(this, locale, { timeZone: SYSTEM_TIMEZONE, ...options });
  };

  Date.prototype.toLocaleDateString = function (locale, options = {}) {
    return origToLocaleDateString.call(this, locale, { timeZone: SYSTEM_TIMEZONE, ...options });
  };

  Date.prototype.toLocaleTimeString = function (locale, options = {}) {
    return origToLocaleTimeString.call(this, locale, { timeZone: SYSTEM_TIMEZONE, ...options });
  };

  // Also patch Intl.DateTimeFormat to default to system timezone when not specified
  const origDateTimeFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function (locale, options = {}) {
    return new origDateTimeFormat(locale, { timeZone: SYSTEM_TIMEZONE, ...options });
  };
  Intl.DateTimeFormat.prototype = origDateTimeFormat.prototype;
}

export { SYSTEM_TIMEZONE };