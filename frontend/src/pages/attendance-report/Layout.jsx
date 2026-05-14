import React from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/allsidebar';
import { Button } from '@/components/ui/button';

export default function AttendanceReportLayout() {
  const { branchId } = useParams();
  const navigate = useNavigate();

  const basePath = `/attendance-report/branch/${branchId}`;

  const tabClassName = ({ isActive }) =>
    `px-3 py-1 rounded-full text-sm font-medium transition-colors ${isActive
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-1 p-4 px-8 lg:p-6 lg:ml-64 overflow-y-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                ←
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">Attendance Report</h1>
            </div>
            <p className="text-sm text-slate-400">Complete attendance reports and breakdowns</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <NavLink to={basePath} end className={tabClassName}>Daily</NavLink>
            <NavLink to={`${basePath}/late-arrivals`} className={tabClassName}>Late Arrivals</NavLink>
            <NavLink to={`${basePath}/early-departure`} className={tabClassName}>Early Departures</NavLink>
            <NavLink to={`${basePath}/monthly-reports`} className={tabClassName}>Monthly Reports</NavLink>
            <NavLink to={`${basePath}/detailed-monthly`} className={tabClassName}>Detailed Monthly</NavLink>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
