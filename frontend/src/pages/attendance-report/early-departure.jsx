import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { useDateFormatPreference } from '../../hooks/useDateFormatPreference';
import { Button } from '../../components/ui/button';
import { AttendanceDateFilter } from '../../components/AttendanceDateFilter';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { createDateSelection } from '../../lib/calendar-sync';

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EarlyDeparturesReport() {
  const { branchId } = useParams();
  const selectedBranchId = branchId || null;
  const selectedDepartmentId = null;
  const { dateFormat, loading: datePrefLoading } = useDateFormatPreference();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState('');
  const [currentDateFormat, setCurrentDateFormat] = useState(dateFormat);
  const hasInitializedDateRef = useRef(false);

  const reportLabel = useMemo(() => attendanceDate, [attendanceDate]);

  const loadReport = useCallback(async (nextDate = attendanceDate, nextFormat = currentDateFormat) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.dashboard.getEarlyDepartures(selectedBranchId, selectedDepartmentId, nextDate, nextFormat);
      setData(res);
    } catch (err) {
      console.error(err);
      setError(String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [attendanceDate, currentDateFormat, selectedBranchId, selectedDepartmentId]);

  useEffect(() => {
    setCurrentDateFormat(dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    if (datePrefLoading || hasInitializedDateRef.current) return;

    const nextFormat = dateFormat === 'bs' ? 'bs' : 'ad';
    const todaySelection = createDateSelection(getToday(), 'ad');
    const nextDate = todaySelection[nextFormat] || getToday();

    hasInitializedDateRef.current = true;
    setAttendanceDate(nextDate);
    setCurrentDateFormat(nextFormat);
    void loadReport(nextDate, nextFormat);
  }, [dateFormat, datePrefLoading, loadReport]);

  return (
    <div className="w-full min-w-0 py-2">
      <div className="mb-6">
        <AttendanceDateFilter
          mode="single"
          initialDateFormat={currentDateFormat}
          initialDateSourceFormat="ad"
          initialDate={attendanceDate || getToday()}
          applyLabel="Apply Date"
          onApply={({ startDate: nextDate, dateFormat: nextFormat }) => {
            setAttendanceDate(nextDate);
            setCurrentDateFormat(nextFormat);
            void loadReport(nextDate, nextFormat);
          }}
        />
      </div>
      <Card className="overflow-hidden border-slate-800 bg-slate-900/80 text-slate-100 shadow-xl">
        <CardHeader className="border-b border-slate-800 bg-slate-900/70">
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-base font-semibold sm:text-lg">Early Departures</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs font-normal text-slate-400 sm:text-sm">{reportLabel}</span>
              <span className="text-xs font-normal text-slate-500 sm:text-sm">({currentDateFormat.toUpperCase()})</span>
              <Button onClick={() => void loadReport(attendanceDate, currentDateFormat)} className="sm:shrink-0">Refresh</Button>
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
          ) : (!data || !data.early_departures || !data.early_departures.length) ? (
            <div className="p-6 text-sm text-slate-300">No early departures for the selected date/filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="px-3 py-3 text-slate-400">S.N.</TableHead>
                    <TableHead className="px-3 py-3 text-slate-400">Employee Name</TableHead>
                    <TableHead className="px-3 py-3 text-slate-400">Scheduled Time</TableHead>
                    <TableHead className="px-3 py-3 text-slate-400">Actual Time</TableHead>
                    <TableHead className="px-3 py-3 text-slate-400">Left Early</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.early_departures.map((item, idx) => (
                    <TableRow key={item.employee?.id || idx} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="px-3 py-2 font-medium">{idx + 1}</TableCell>
                      <TableCell className="px-3 py-2">{item.employee?.name || item.employee?.employee_name || 'Unknown'}</TableCell>
                      <TableCell className="px-3 py-2">{item.scheduled_departure ? new Date(item.scheduled_departure).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}</TableCell>
                      <TableCell className="px-3 py-2 text-amber-300">{item.check_out ? new Date(item.check_out).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}</TableCell>
                      <TableCell className="px-3 py-2"><span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300">{item.early_minutes ? `${item.early_minutes}m` : '-'}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
