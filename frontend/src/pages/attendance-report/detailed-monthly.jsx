'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateFormatBadge } from '@/components/DateDisplay';

function padDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: padDate(start),
    endDate: padDate(end),
  };
}

function formatDayLabel(dateValue, dateFormat) {
  if (dateFormat === 'bs') {
    return { firstLine: dateValue, secondLine: '' };
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { firstLine: dateValue, secondLine: '' };
  }

  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  const day = new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date);
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);

  return {
    firstLine: `${month} ${day}`,
    secondLine: `(${weekday})`,
  };
}

function getDayMarker(day) {
  if (!day?.present) return 'A';
  if (Number(day?.late_seconds || 0) > 0) return 'L';
  if (Number(day?.early_seconds || 0) > 0) return 'E';
  return 'P';
}

function getDayColorClass(marker) {
  if (marker === 'P') return 'text-emerald-300';
  if (marker === 'A') return 'text-rose-300';
  if (marker === 'L') return 'text-amber-300';
  if (marker === 'E') return 'text-sky-300';
  return 'text-slate-300';
}

export default function DetailedMonthly() {
  const { branchId } = useParams();
  const initialBounds = useMemo(() => getMonthBounds(), []);
  const [startDate, setStartDate] = useState(initialBounds.startDate);
  const [endDate, setEndDate] = useState(initialBounds.endDate);
  const [dateFormat, setDateFormat] = useState('ad');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reportDates = useMemo(() => {
    const dates = [];
    if (!startDate || !endDate) return dates;

    const current = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (!Number.isNaN(current.getTime()) && !Number.isNaN(end.getTime()) && current <= end) {
      dates.push(padDate(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const reportLabel = useMemo(() => {
    if (!startDate || !endDate) return 'Selected dates';
    return `${startDate} — ${endDate}`;
  }, [startDate, endDate]);

  const loadReport = useCallback(async (nextStart = startDate, nextEnd = endDate, nextFormat = dateFormat) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.dashboard.getMonthlySummaryDetailed({
        branchId,
        startDate: nextStart,
        endDate: nextEnd,
        dateFormat: nextFormat,
      });
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branchId, dateFormat, endDate, startDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const rows = data?.rows || [];
  const itemsPerPage = 30;
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const pageStartIndex = (currentPage - 1) * itemsPerPage;
  const pageRows = showAll ? rows : rows.slice(pageStartIndex, pageStartIndex + itemsPerPage);
  const displayStart = rows.length ? (showAll ? 1 : pageStartIndex + 1) : 0;
  const displayEnd = showAll ? rows.length : Math.min(pageStartIndex + pageRows.length, rows.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const handleExportCsv = () => {
    const header = ['S.N.', 'Employee', 'Code', ...reportDates, 'Present Days', 'Absent Days', 'Late Days', 'Worked Hours'];
    const csvRows = [header];

    rows.forEach((item, index) => {
      const dayValues = (item.days || []).map((day) => getDayMarker(day));
      const presentDays = dayValues.filter((value) => value !== 'A').length;
      const absentDays = dayValues.filter((value) => value === 'A').length;
      const lateDays = (item.days || []).filter((day) => Number(day?.late_seconds || 0) > 0).length;
      const workedHours = (item.days || []).reduce((sum, day) => sum + Number(day?.worked_hours || 0), 0);

      csvRows.push([
        index + 1,
        item.employee?.name || 'Unknown',
        item.employee?.employee_code || '-',
        ...dayValues,
        presentDays,
        absentDays,
        lateDays,
        workedHours.toFixed(2),
      ]);
    });

    const csv = csvRows
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detailed-monthly-summary-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();
  const handleToggleShowAll = () => setShowAll((value) => !value);

  return (
    <div className="w-full min-w-0 px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
      <div className="mb-6 flex flex-col gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detailed Monthly Attendance Summary</h1>
          <p className="text-sm text-slate-400">Filter any date range and export the report as CSV or PDF.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Format</label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
            >
              <option value="ad">AD</option>
              <option value="bs">BS</option>
            </select>
          </div>
          <Button onClick={() => void loadReport(startDate, endDate, dateFormat)} className="bg-emerald-600 text-white hover:bg-emerald-700">Apply Range</Button>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-800 bg-slate-900/80 text-slate-100 shadow-xl">
        <CardHeader className="border-b border-slate-800 bg-slate-900/70">
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-base font-semibold sm:text-lg">Detailed Monthly Summary</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs font-normal text-slate-400 sm:text-sm">{reportLabel}</span>
              <DateFormatBadge date={reportLabel} format={dateFormat} />
              <Button variant="outline" className="bg-slate-800 text-white hover:bg-slate-700" onClick={handleToggleShowAll} disabled={!rows.length}>{showAll ? 'Show 30/page' : 'Show All'}</Button>
              <Button variant="outline" className="bg-slate-800 text-white hover:bg-slate-700" onClick={handleExportCsv} disabled={!rows.length}>Export CSV</Button>
              <Button variant="outline" className="bg-slate-800 text-white hover:bg-slate-700" onClick={handlePrint} disabled={!rows.length}>Export PDF</Button>
              {!showAll && rows.length > 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                </div>
              ) : null}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-300">Error: {error}</div>
          ) : !rows.length ? (
            <div className="p-6 text-sm text-slate-300">No data for the selected dates.</div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <div className="min-w-max px-2">
                <Table className="w-max min-w-full">
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="px-3 py-3 text-slate-400">S.N.</TableHead>
                      <TableHead className="px-3 py-3 text-slate-400">Employee</TableHead>
                      {reportDates.map((dateValue) => {
                        const { firstLine, secondLine } = formatDayLabel(dateValue, dateFormat);
                        return (
                          <TableHead key={dateValue} className="px-3 py-3 text-center text-slate-400">
                            <div className="leading-tight">
                              <div>{firstLine}</div>
                              {secondLine ? <div className="text-xs text-slate-500">{secondLine}</div> : null}
                            </div>
                          </TableHead>
                        );
                      })}
                      <TableHead className="px-3 py-3 text-right text-slate-400">Present</TableHead>
                      <TableHead className="px-3 py-3 text-right text-slate-400">Absent</TableHead>
                      <TableHead className="px-3 py-3 text-right text-slate-400">Late</TableHead>
                      <TableHead className="px-3 py-3 text-right text-slate-400">Hours</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pageRows.map((item, index) => {
                      const dayValues = (item.days || []).map((day) => getDayMarker(day));
                      const presentDays = dayValues.filter((value) => value !== 'A').length;
                      const absentDays = dayValues.filter((value) => value === 'A').length;
                      const lateDays = (item.days || []).filter((day) => Number(day?.late_seconds || 0) > 0).length;
                      const workedHours = (item.days || []).reduce((sum, day) => sum + Number(day?.worked_hours || 0), 0);

                      return (
                        <TableRow key={item.employee?.id ?? index} className="border-slate-800 hover:bg-slate-800/40">
                          <TableCell className="px-3 py-2 font-medium">{displayStart + index}</TableCell>
                          <TableCell className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-100">{item.employee?.name || 'Unknown'}</span>
                              <span className="text-xs text-slate-400">{item.employee?.employee_code || '-'}</span>
                            </div>
                          </TableCell>

                          {dayValues.map((marker, dayIndex) => (
                            <TableCell key={`${item.employee?.id ?? index}-${dayIndex}`} className={`px-3 py-2 text-center font-semibold ${getDayColorClass(marker)}`}>
                              {marker}
                            </TableCell>
                          ))}

                          <TableCell className="px-3 py-2 text-right text-emerald-300">{presentDays}</TableCell>
                          <TableCell className="px-3 py-2 text-right text-rose-300">{absentDays}</TableCell>
                          <TableCell className="px-3 py-2 text-right text-amber-300">{lateDays}</TableCell>
                          <TableCell className="px-3 py-2 text-right">{workedHours.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <div>{showAll ? `Showing all ${rows.length} records` : `Showing ${displayStart}–${displayEnd} of ${rows.length} records`}</div>
                {!showAll && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                    <div>Page {currentPage} of {totalPages}</div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
