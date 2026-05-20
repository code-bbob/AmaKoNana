// Minimal calendar-sync utilities to support the AttendanceDateFilter and calendars
// This is a lightweight implementation sufficient for UI selection and formatting.

import { createDateOutput, ENGLISH_MONTHS_AD, ENGLISH_MONTHS_BS } from 'bs-ad-calendar-react';

const MONTHS_BY_FORMAT = {
  ad: ENGLISH_MONTHS_AD,
  bs: ENGLISH_MONTHS_BS,
};

function normalizeCalendarType(format) {
  return format === 'bs' ? 'BS' : 'AD';
}

export function getInitialCalendarSelection() {
  return { ad: '', bs: '' };
}

export function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return { year: NaN, month: NaN, day: NaN };
  const parts = dateStr.split('-').map((p) => Number(p));
  if (parts.length < 3) return { year: NaN, month: NaN, day: NaN };
  const [year, month, day] = parts;
  // month in our selection objects is zero-based (compatible with JS Date getMonth())
  return { year: Number(year), month: Number(month) - 1, day: Number(day) };
}

export function createAdSelection(year, monthZeroBased, day) {
  const mm = String(Number(monthZeroBased) + 1).padStart(2, '0');
  const dd = String(Number(day)).padStart(2, '0');
  return { ad: `${year}-${mm}-${dd}`, bs: '' };
}

export function createBsSelection(year, monthZeroBased, day) {
  // We don't perform actual AD<->BS conversion here; emit a BS-style string for UI purposes.
  const mm = String(Number(monthZeroBased) + 1).padStart(2, '0');
  const dd = String(Number(day)).padStart(2, '0');
  return { bs: `${year}-${mm}-${dd}`, ad: '' };
}

export function createDateSelection(dateValue, sourceFormat = 'ad') {
  const parsed = parseDateString(dateValue);
  if (!parsed || !Number.isFinite(parsed.year) || !Number.isFinite(parsed.month) || !Number.isFinite(parsed.day)) {
    return getInitialCalendarSelection();
  }

  const calendarType = normalizeCalendarType(sourceFormat);
  const months = MONTHS_BY_FORMAT[sourceFormat === 'bs' ? 'bs' : 'ad'];
  const output = createDateOutput(calendarType, parsed.year, parsed.month, parsed.day, months);

  return {
    ad: output.ad,
    bs: output.bs,
  };
}
