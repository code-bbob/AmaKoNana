import React, { useState } from 'react';

export function AttendanceDateFilter({ mode = 'single', initialDate = '', initialDateFormat = 'ad', applyLabel = 'Apply', onApply }) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0,10));
  const [format, setFormat] = useState(initialDateFormat || 'ad');

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
      />
      <select value={format} onChange={(e) => setFormat(e.target.value)} className="px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm">
        <option value="ad">AD</option>
        <option value="bs">BS</option>
      </select>
      <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={() => onApply && onApply({ startDate: date, dateFormat: format })}>{applyLabel}</button>
    </div>
  );
}

export default AttendanceDateFilter;
