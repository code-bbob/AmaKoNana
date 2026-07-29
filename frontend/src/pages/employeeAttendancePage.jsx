"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';
import { AttendanceDateFilter } from '@/components/AttendanceDateFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { createBsSelection, createDateSelection, parseDateString } from '@/lib/calendar-sync';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';
import { ArrowLeft, CalendarDays, Download, FileText, User2 } from 'lucide-react';

function padDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthBounds() {
  const now = new Date();
  return {
    startDate: padDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: padDate(now),
  };
}

function getInitialRange(dateFormat, bounds) {
  if (dateFormat === 'bs') {
    const endSelection = createDateSelection(bounds.endDate, 'ad');
    const endBs = endSelection.bs || bounds.endDate;
    const parsed = parseDateString(endBs);
    const startBsSelection = createBsSelection(parsed.year, parsed.month, 1);
    return {
      startDate: startBsSelection.bs || bounds.startDate,
      endDate: endBs,
    };
  }

  return {
    startDate: bounds.startDate,
    endDate: bounds.endDate,
  };
}

function formatTime(value) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatDuration(seconds, fallback = '-') {
  if (fallback && fallback !== '-') return fallback;

  const totalSeconds = Number(seconds || 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '-';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatDateLabel(day, dateFormat) {
  return dateFormat === 'bs'
    ? (day?.attendance_date_bs || day?.attendance_date || '-')
    : (day?.attendance_date_ad || day?.attendance_date || '-');
}

function getStatusMeta(day) {
  if (!day?.present) {
    return { label: 'Absent', className: 'border-rose-500/30 bg-rose-500/15 text-rose-300' };
  }

  const lateSeconds = Number(day?.late_seconds || 0);
  const earlySeconds = Number(day?.early_seconds || 0);

  if (lateSeconds > 0 && earlySeconds > 0) {
    return { label: 'Late / Early', className: 'border-amber-500/30 bg-amber-500/15 text-amber-300' };
  }

  if (lateSeconds > 0) {
    return { label: 'Late', className: 'border-amber-500/30 bg-amber-500/15 text-amber-300' };
  }

  if (earlySeconds > 0) {
    return { label: 'Early', className: 'border-sky-500/30 bg-sky-500/15 text-sky-300' };
  }

  return { label: 'Present', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' };
}

function MetricCard({ title, value, helper, icon }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm shadow-slate-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
          <div className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-50">{value}</div>
          {helper ? <div className="mt-1 text-xs text-slate-400">{helper}</div> : null}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-300">{icon}</div>
      </div>
    </div>
  );
}

function buildBreakField(sessions, key) {
  if (!Array.isArray(sessions) || !sessions.length) return '-';

  const values = sessions
    .map((session) => formatTime(session?.[key]))
    .filter((value) => value && value !== '-');

  return values.length ? values.join('\n') : '-';
}

export default function EmployeeAttendancePage() {
  const { employeeId, branchId } = useParams();
  const navigate = useNavigate();
  const { dateFormat, loading: prefLoading } = useDateFormatPreference();
  const initialBounds = useMemo(() => getMonthBounds(), []);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentDateFormat, setCurrentDateFormat] = useState(dateFormat);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasInitializedRangeRef = useRef(false);

  const loadReport = useCallback(async (nextStart = startDate, nextEnd = endDate, nextFormat = currentDateFormat) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.dashboard.getMonthlySummaryDetailed({
        branchId,
        employeeId,
        startDate: nextStart,
        endDate: nextEnd,
        dateFormat: nextFormat,
      });
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load attendance details');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, currentDateFormat, employeeId, endDate, startDate]);

  useEffect(() => {
    setCurrentDateFormat(dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    if (prefLoading || hasInitializedRangeRef.current) return;

    const nextFormat = dateFormat === 'bs' ? 'bs' : 'ad';
    const nextRange = getInitialRange(nextFormat, initialBounds);

    hasInitializedRangeRef.current = true;
    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
    setCurrentDateFormat(nextFormat);
    void loadReport(nextRange.startDate, nextRange.endDate, nextFormat);
  }, [dateFormat, initialBounds, loadReport, prefLoading]);

  const employeeRow = data?.rows?.[0] || null;
  const attendanceDays = employeeRow?.days || [];
  const reportLabel = useMemo(() => {
    if (!startDate || !endDate) return 'Selected dates';
    return `${startDate} — ${endDate}`;
  }, [endDate, startDate]);

  const totals = useMemo(() => {
    const totalDays = attendanceDays.length;
    const presentDays = attendanceDays.filter((day) => day.present).length;
    const lateDays = attendanceDays.filter((day) => Number(day?.late_seconds || 0) > 0).length;
    const earlyDays = attendanceDays.filter((day) => Number(day?.early_seconds || 0) > 0).length;
    const workedHours = attendanceDays.reduce((sum, day) => sum + Number(day?.worked_hours || 0), 0);

    return {
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      lateDays,
      earlyDays,
      workedHours,
    };
  }, [attendanceDays]);

  const handleExportCsv = () => {
    if (!attendanceDays.length) return;

    const header = ['Date', 'Status', 'Check In', 'Check Out', 'Break Out', 'Break In', 'Late By', 'Early By', 'Worked Hours'];
    const rows = [header];

    attendanceDays.forEach((day) => {
      rows.push([
        formatDateLabel(day, currentDateFormat),
        getStatusMeta(day).label,
        formatTime(day.first_check_in),
        formatTime(day.last_check_out),
        buildBreakField(day.break_sessions, 'break_out'),
        buildBreakField(day.break_sessions, 'break_in'),
        formatDuration(day.late_seconds, day.late_duration),
        formatDuration(day.early_seconds, day.early_duration),
        Number(day.worked_hours || 0).toFixed(2),
      ]);
    });

    const csv = rows
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-attendance-${employeeRow?.employee?.name || 'export'}-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!attendanceDays.length) return;

    const doc = new jsPDF({ orientation: 'landscape' });
    const employeeName = employeeRow?.employee?.name || 'Employee';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`Attendance Details - ${employeeName}`, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Period: ${reportLabel} (${currentDateFormat.toUpperCase()})`, 14, 25);

    doc.autoTable({
      startY: 31,
      head: [['Date', 'Status', 'Check In', 'Check Out', 'Break Out', 'Break In', 'Late By', 'Early By', 'Worked Hours']],
      body: attendanceDays.map((day) => [
        formatDateLabel(day, currentDateFormat),
        getStatusMeta(day).label,
        formatTime(day.first_check_in),
        formatTime(day.last_check_out),
        buildBreakField(day.break_sessions, 'break_out'),
        buildBreakField(day.break_sessions, 'break_in'),
        formatDuration(day.late_seconds, day.late_duration),
        formatDuration(day.early_seconds, day.early_duration),
        Number(day.worked_hours || 0).toFixed(2),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const finalY = doc.lastAutoTable?.finalY || 35;
    doc.setFont('helvetica', 'bold');
    doc.text(`Present Days: ${totals.presentDays}`, 14, finalY + 10);
    doc.text(`Absent Days: ${totals.absentDays}`, 14, finalY + 16);
    doc.text(`Late Days: ${totals.lateDays}`, 14, finalY + 22);
    doc.text(`Worked Hours: ${totals.workedHours.toFixed(2)}`, 14, finalY + 28);
    doc.save(`employee-attendance-${employeeName}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/20">
          <Skeleton className="h-10 w-56 bg-slate-800" />
          <Skeleton className="h-32 w-full bg-slate-800" />
          <Skeleton className="h-64 w-full bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
        <Card className="border-rose-500/20 bg-slate-950/80 text-slate-100 shadow-xl shadow-slate-950/20">
          <CardHeader>
            <CardTitle className="text-rose-300">Error loading attendance details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div>{error}</div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800" onClick={() => navigate(`/employee/branch/${branchId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employees
              </Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
      <div className="mb-6 flex flex-col gap-4 print:hidden">
         <Button variant="outline" className="border-slate-700 m-2 bg-slate-950 text-white hover:bg-slate-900 hover:text-white w-32" onClick={() => navigate(`/employee/branch/${branchId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

        <div className="flex flex-wrap items-center gap-3">
                   <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-50">Employee Attendance Details</h1>
            <p className="text-sm text-slate-400">
              Month-bounded attendance summary for {employeeRow?.employee?.name || 'this employee'}.
            </p>
          </div>
        </div>

        <AttendanceDateFilter
          mode="range"
          initialDateFormat={currentDateFormat}
          initialDateSourceFormat={currentDateFormat}
          initialStartDate={startDate}
          initialEndDate={endDate}
          applyLabel="Apply Range"
          onApply={({ startDate: nextStart, endDate: nextEnd, dateFormat: nextFormat }) => {
            setStartDate(nextStart);
            setEndDate(nextEnd);
            setCurrentDateFormat(nextFormat);
            void loadReport(nextStart, nextEnd, nextFormat);
          }}
        />
      </div>

      <Card className="overflow-hidden border-slate-800 bg-slate-900/80 text-slate-100 shadow-xl shadow-slate-950/20">
        <CardHeader className="border-b border-slate-800 bg-slate-900/70">
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-base font-semibold sm:text-lg">Attendance Records</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs font-normal text-slate-400 sm:text-sm">{reportLabel}</span>
              <span className="text-xs font-normal text-slate-500 sm:text-sm">({currentDateFormat.toUpperCase()})</span>
              <Button variant="outline" className="border-slate-700 bg-slate-950 text-white hover:bg-slate-800" onClick={handleExportCsv} disabled={!attendanceDays.length}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" className="border-slate-700 bg-slate-950 text-white hover:bg-slate-800" onClick={handleExportPdf} disabled={!attendanceDays.length}>
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              title="Employee"
              value={employeeRow?.employee?.name || 'Unknown'}
              helper={employeeRow?.employee?.employee_code || `ID ${employeeId}`}
              icon={<User2 className="h-4 w-4 text-slate-300" />}
            />
            <MetricCard
              title="Present Days"
              value={totals.presentDays}
              helper={`${totals.totalDays ? Math.round((totals.presentDays / totals.totalDays) * 100) : 0}% attendance rate`}
              icon={<CalendarDays className="h-4 w-4 text-emerald-300" />}
            />
            <MetricCard title="Absent Days" value={totals.absentDays} helper="Days without attendance" icon={<CalendarDays className="h-4 w-4 text-rose-300" />} />
            <MetricCard title="Late Days" value={totals.lateDays} helper="Checked in after schedule" icon={<CalendarDays className="h-4 w-4 text-amber-300" />} />
            <MetricCard title="Early Days" value={totals.earlyDays} helper="Checked out before schedule" icon={<CalendarDays className="h-4 w-4 text-sky-300" />} />
            <MetricCard title="Worked Hours" value={totals.workedHours.toFixed(2)} helper="Total for selected range" icon={<CalendarDays className="h-4 w-4 text-violet-300" />} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="px-3 py-3 text-slate-400">Date</TableHead>
                  <TableHead className="px-3 py-3 text-slate-400">Status</TableHead>
                  <TableHead className="px-3 py-3 text-slate-400">Check In</TableHead>
                  <TableHead className="px-3 py-3 text-slate-400">Check Out</TableHead>
                  <TableHead className="px-3 py-3 text-slate-400">Break Out</TableHead>
                  <TableHead className="px-3 py-3 text-slate-400">Break In</TableHead>
                  <TableHead className="px-3 py-3 text-slate-400">Late By</TableHead>
                  <TableHead className="px-3 py-3 text-slate-400">Early By</TableHead>
                  <TableHead className="px-3 py-3 text-right text-slate-400">Worked Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceDays.length ? attendanceDays.map((day, index) => {
                  const status = getStatusMeta(day);

                  return (
                    <TableRow key={`${employeeId}-${day.attendance_date || index}`} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="px-3 py-2 font-medium text-slate-100">{formatDateLabel(day, currentDateFormat)}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-slate-300">{formatTime(day.first_check_in)}</TableCell>
                      <TableCell className="px-3 py-2 text-slate-300">{formatTime(day.last_check_out)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-pre-line text-slate-300">{buildBreakField(day.break_sessions, 'break_out')}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-pre-line text-slate-300">{buildBreakField(day.break_sessions, 'break_in')}</TableCell>
                      <TableCell className="px-3 py-2 text-slate-300">{formatDuration(day.late_seconds, day.late_duration)}</TableCell>
                      <TableCell className="px-3 py-2 text-slate-300">{formatDuration(day.early_seconds, day.early_duration)}</TableCell>
                      <TableCell className="px-3 py-2 text-right font-medium text-slate-100">{Number(day.worked_hours || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableCell colSpan={9} className="py-12 text-center text-slate-400">
                      No attendance records found for the selected range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
