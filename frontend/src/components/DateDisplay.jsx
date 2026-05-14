import React from 'react';

export function DateFormatBadge({ date, format }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-300">
      <span className="px-2 py-1 bg-slate-800 rounded">{date}</span>
      <span className="px-2 py-1 bg-slate-700 rounded text-xs">{format}</span>
    </span>
  );
}

export default DateFormatBadge;
