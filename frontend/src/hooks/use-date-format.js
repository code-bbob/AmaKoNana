// Compatibility wrapper for older import paths and centralized exports
// Re-exports helpers from `useDateFormatPreference.js` so modules importing
// `@/hooks/use-date-format` work without changing all call sites.

import {
  getDateFormatPreference as _getDateFormatPreference,
  setDateFormatPreference as _setDateFormatPreference,
  useDateFormatPreference as _useDateFormatPreference,
} from './useDateFormatPreference';

export function getDateFormatPreference() {
  return _getDateFormatPreference();
}

export function setDateFormatPreference(format) {
  return _setDateFormatPreference(format);
}

export const useDateFormatPreference = _useDateFormatPreference;

// For compatibility with TypeScript imports that expect a DateFormat type,
// consumers in JS can treat values as the strings 'ad' or 'bs'.
