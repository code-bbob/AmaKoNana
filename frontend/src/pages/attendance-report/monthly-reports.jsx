import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { useDateFormatPreference } from '../../hooks/useDateFormatPreference';
import { AttendanceDateFilter } from '../../components/AttendanceDateFilter';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { createDateSelection, parseDateString, createBsSelection } from '../../lib/calendar-sync';

function padDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: padDate(start),
    endDate: padDate(now),
  };
}

function formatWorkedHours(value) {
  return typeof value === 'number' ? value.toFixed(2) : '-';
}

export default function MonthlyReports() {
  const { branchId } = useParams();
  const { dateFormat, loading: prefLoading } = useDateFormatPreference();
  const initialBounds = useMemo(() => getMonthBounds(), []);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentDateFormat, setCurrentDateFormat] = useState(dateFormat);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasInitializedRangeRef = useRef(false);

  const reportLabel = useMemo(() => {
    if (!startDate || !endDate) return 'Selected dates';
    return `${startDate} — ${endDate}`;
  }, [startDate, endDate]);

  const loadReport = useCallback(async (nextStart = startDate, nextEnd = endDate, nextFormat = currentDateFormat) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.dashboard.getMonthlySummary({
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
  }, [branchId, currentDateFormat, endDate, startDate]);

  useEffect(() => {
    setCurrentDateFormat(dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    if (prefLoading || hasInitializedRangeRef.current) return;

    const nextFormat = dateFormat === 'bs' ? 'bs' : 'ad';

    let nextStart;
    let nextEnd;

    if (nextFormat === 'bs') {
      // derive BS month-start and BS today directly
      const endSelection = createDateSelection(initialBounds.endDate, 'ad');
      const endBs = endSelection.bs || initialBounds.endDate;
      const parsed = parseDateString(endBs);
      const startBsSel = createBsSelection(parsed.year, parsed.month, 1);
      nextStart = startBsSel.bs || initialBounds.startDate;
      nextEnd = endBs;
    } else {
      const startSelection = createDateSelection(initialBounds.startDate, 'ad');
      const endSelection = createDateSelection(initialBounds.endDate, 'ad');
      nextStart = startSelection[nextFormat] || initialBounds.startDate;
      nextEnd = endSelection[nextFormat] || initialBounds.endDate;
    }

    hasInitializedRangeRef.current = true;
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setCurrentDateFormat(nextFormat);
    void loadReport(nextStart, nextEnd, nextFormat);
  }, [dateFormat, initialBounds.endDate, initialBounds.startDate, loadReport, prefLoading]);

  const rows = data?.summary || [];
  const itemsPerPage = 30;
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const pageStartIndex = (currentPage - 1) * itemsPerPage;
  const pageRows = showAll ? rows : rows.slice(pageStartIndex, pageStartIndex + itemsPerPage);
  const displayStart = rows.length ? (showAll ? 1 : pageStartIndex + 1) : 0;
  const displayEnd = showAll ? rows.length : Math.min(pageStartIndex + pageRows.length, rows.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const totals = rows.reduce((acc, item) => {
    acc.totalDays += Number(item.total_days || 0);
    acc.presentDays += Number(item.present_days || 0);
    acc.absentDays += Number(item.absent_days || 0);
    acc.lateDays += Number(item.late_days || 0);
    acc.workedHours += Number(item.worked_hours || 0);
    return acc;
  }, { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, workedHours: 0 });

  const handleExportCsv = () => {
    const header = ['S.N.', 'Employee', 'Code', 'Total Days', 'Present Days', 'Absent Days', 'Late Days', 'Worked Hours'];
    const lines = [
      header,
      ...rows.map((item, index) => [
        index + 1,
        item.employee?.name || 'Unknown',
        item.employee?.employee_code || '-',
        item.total_days ?? '-',
        item.present_days ?? '-',
        item.absent_days ?? '-',
        item.late_days ?? '-',
        formatWorkedHours(item.worked_hours),
      ]),
    ];
    const csv = lines
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly-summary-${startDate}-to-${endDate}.csv`;
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
          <h1 className="text-3xl font-bold tracking-tight">Monthly Attendance Summary</h1>
          <p className="text-sm text-slate-400">Filter any date range and export the report as CSV or PDF.</p>
        </div>

        <AttendanceDateFilter
          mode="range"
          initialDateFormat={currentDateFormat}
          initialDateSourceFormat={dateFormat === 'bs' ? 'bs' : 'ad'}
          initialStartDate={dateFormat === 'bs' ? (createDateSelection(initialBounds.endDate, 'ad').bs ? createBsSelection(parseDateString(createDateSelection(initialBounds.endDate, 'ad').bs).year, parseDateString(createDateSelection(initialBounds.endDate, 'ad').bs).month, 1).bs : initialBounds.startDate) : initialBounds.startDate}
          initialEndDate={dateFormat === 'bs' ? (createDateSelection(initialBounds.endDate, 'ad').bs || initialBounds.endDate) : initialBounds.endDate}
          applyLabel="Apply Range"
          onApply={({ startDate: nextStart, endDate: nextEnd, dateFormat: nextFormat }) => {
            setStartDate(nextStart);
            setEndDate(nextEnd);
            setCurrentDateFormat(nextFormat);
            void loadReport(nextStart, nextEnd, nextFormat);
          }}
        />
      </div>

      <Card className="overflow-hidden border-slate-800 bg-slate-900/80 text-slate-100 shadow-xl">
        <CardHeader className="border-b border-slate-800 bg-slate-900/70">
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-base font-semibold sm:text-lg">Monthly Summary</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs font-normal text-slate-400 sm:text-sm">{reportLabel}</span>
              <span className="text-xs font-normal text-slate-500 sm:text-sm">({currentDateFormat.toUpperCase()})</span>
              <Button variant="outline" className="bg-slate-800 text-white hover:bg-slate-700" onClick={handleExportCsv} disabled={!rows.length}>Export CSV</Button>
              <Button variant="outline" className="bg-slate-800 text-white hover:bg-slate-700" onClick={handlePrint} disabled={!rows.length}>Export PDF</Button>
              <Button variant="outline" className="bg-slate-800 text-white hover:bg-slate-700" onClick={handleToggleShowAll} disabled={!rows.length}>{showAll ? 'Show 30/page' : 'Show All'}</Button>
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
                <Table className="min-w-full w-max">
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="w-20 px-3 py-3 text-slate-400">S.N.</TableHead>
                      <TableHead className="px-3 py-3 text-slate-400">Employee</TableHead>
                      <TableHead className="w-28 px-3 py-3 text-right text-slate-400">Total Days</TableHead>
                      <TableHead className="w-28 px-3 py-3 text-right text-slate-400">Present</TableHead>
                      <TableHead className="w-28 px-3 py-3 text-right text-slate-400">Absent</TableHead>
                      <TableHead className="w-28 px-3 py-3 text-right text-slate-400">Late</TableHead>
                      <TableHead className="w-36 px-3 py-3 text-right text-slate-400">Worked Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((item, index) => (
                      <TableRow key={item.employee?.id ?? index} className="border-slate-800 hover:bg-slate-800/40">
                        <TableCell className="px-3 py-2 font-medium">{displayStart + index}</TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-100">{item.employee?.name || 'Unknown'}</span>
                            <span className="text-xs text-slate-400">{item.employee?.employee_code || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">{item.total_days ?? '-'}</TableCell>
                        <TableCell className="px-3 py-2 text-right font-medium text-emerald-300">{item.present_days ?? '-'}</TableCell>
                        <TableCell className="px-3 py-2 text-right font-medium text-rose-300">{item.absent_days ?? '-'}</TableCell>
                        <TableCell className="px-3 py-2 text-right font-medium text-amber-300">{item.late_days ?? '-'}</TableCell>
                        <TableCell className="px-3 py-2 text-right font-medium">{formatWorkedHours(item.worked_hours)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-slate-800 bg-slate-800/40 font-medium hover:bg-slate-800/40">
                      <TableCell colSpan={2} className="px-3 py-2 text-right">Totals</TableCell>
                      <TableCell className="px-3 py-2 text-right">{totals.totalDays}</TableCell>
                      <TableCell className="px-3 py-2 text-right text-emerald-300">{totals.presentDays}</TableCell>
                      <TableCell className="px-3 py-2 text-right text-rose-300">{totals.absentDays}</TableCell>
                      <TableCell className="px-3 py-2 text-right text-amber-300">{totals.lateDays}</TableCell>
                      <TableCell className="px-3 py-2 text-right">{totals.workedHours.toFixed(2)}</TableCell>
                    </TableRow>
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
