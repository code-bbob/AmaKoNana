import React from 'react';
import { NavLink, useParams } from 'react-router-dom';

export function AttendanceReportTabs() {
  const { branchId } = useParams();
  const base = `/attendance-report/branch/${branchId}`;

  const tabClassName = ({ isActive }) =>
    `px-3 py-1 rounded-full text-sm font-medium transition-colors ${isActive
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NavLink to={base} end className={tabClassName}>Daily</NavLink>
      <NavLink to={`${base}/late-arrivals`} className={tabClassName}>Late Arrivals</NavLink>
      <NavLink to={`${base}/early-departure`} className={tabClassName}>Early Departures</NavLink>
      <NavLink to={`${base}/monthly-reports`} className={tabClassName}>Monthly Reports</NavLink>
      <NavLink to={`${base}/detailed-monthly`} className={tabClassName}>Detailed Monthly</NavLink>
    </div>
  );
}

export default AttendanceReportTabs;
