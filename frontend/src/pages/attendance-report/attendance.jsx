'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAxios from '@/utils/useAxios';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';

// shadcn UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader, Download } from 'lucide-react';

const formatTime = (value) => {
  if (!value) return '-';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
};

const getBreakSessions = (row) => (Array.isArray(row.break_sessions) ? row.break_sessions : []);

export default function AttendanceTab() {
  const api = useAxios();
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { dateFormat } = useDateFormatPreference();

  const [loading, setLoading] = useState(true);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [allAttendanceRows, setAllAttendanceRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showAllLoading, setShowAllLoading] = useState(false);
  const [attendanceDateAd, setAttendanceDateAd] = useState(null);
  const [attendanceDateBs, setAttendanceDateBs] = useState(null);
  const [departments, setDepartments] = useState([]);

  const attendanceDate = dateFormat === 'bs'
    ? (attendanceDateBs || attendanceDateAd)
    : (attendanceDateAd || attendanceDateBs);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      setLoading(true);
      try {
        const res = await api.get(`attendance/api/dashboard/branch/${branchId}/`);
        if (cancelled) return;
        setAttendanceDateAd(res.data?.attendance_date_ad || res.data?.attendance_date || null);
        setAttendanceDateBs(res.data?.attendance_date_bs || null);
        setDepartments(res.data?.departments || []);
      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadInitial();
    return () => { cancelled = true; };
  }, [branchId]);

  useEffect(() => {
    if (!branchId || showAll) return;
    let cancelled = false;
    const loadRows = async () => {
      try {
        setRowsLoading(true);
        const params = new URLSearchParams({ branch_id: String(branchId), page: String(currentPage) });
        const response = await api.get(`attendance/api/attendance/rows/?${params.toString()}`);
        if (cancelled) return;
        setAttendanceRows(Array.isArray(response.data?.attendance_rows) ? response.data.attendance_rows : []);
        setTotalCount(typeof response.data?.count === 'number' ? response.data.count : response.data?.attendance_rows?.length || 0);
      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    };
    loadRows();
    return () => { cancelled = true; };
  }, [branchId, currentPage, showAll]);

  const handleShowAll = async () => {
    try {
      setShowAllLoading(true);
      const params = new URLSearchParams();
      params.append('branch_id', String(branchId));
      let page = 1;
      const results = [];
      while (true) {
        const p = new URLSearchParams(params);
        p.append('page', String(page));
        const res = await api.get(`attendance/api/attendance/rows/?${p.toString()}`);
        const pageRows = Array.isArray(res.data?.attendance_rows) ? res.data.attendance_rows : [];
        results.push(...pageRows);
        if (pageRows.length === 0 || !res.data?.pagination?.next) break;
        page += 1;
      }
      setAllAttendanceRows(results);
      setShowAll(true);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setShowAllLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    const rows = showAll ? allAttendanceRows : attendanceRows;
    if (!rows || !rows.length) return;
    const csv = [
      ['S.N.', 'Employee', 'Status', 'Check In', 'Check Out', 'Break Out', 'Break In', 'Hours Worked'],
      ...rows.map((row, idx) => [
        idx + 1,
        row.employee?.name || 'Unknown',
        row.present ? 'Present' : 'Absent',
        row.check_in || '',
        row.check_out || '',
        getBreakSessions(row).map((s) => formatTime(s.break_out)).join('; ') || '-',
        getBreakSessions(row).map((s) => formatTime(s.break_in)).join('; ') || '-',
        ((row.worked_minutes || 0) / 60).toFixed(2),
      ])
    ].map(line => line.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${attendanceDate || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const itemsPerPage = 30;
  const rowsSource = showAll ? allAttendanceRows : attendanceRows;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const displayStart = showAll ? (rowsSource.length ? 1 : 0) : (totalCount ? startIndex + 1 : 0);
  const displayEnd = showAll ? Math.min(rowsSource.length, endIndex) : Math.min(startIndex + rowsSource.length, totalCount || rowsSource.length);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Daily Attendance Roll</h2>
          <p className="text-sm text-slate-400">Complete attendance records for {attendanceDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadCsv} className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!rowsSource.length}><Download className="h-4 w-4 "/> Export CSV</Button>
          <Button onClick={handleShowAll} disabled={showAllLoading || showAll} variant={showAll ? 'secondary' : 'outline'} className="rounded-lg text-black">{showAll ? 'Showing All' : (showAllLoading ? 'Loading...' : 'Show All')}</Button>
        </div>
      </div>

      <Card className="border-slate-700 bg-slate-900/50 shadow-lg">
        <CardHeader className="border-b border-slate-700">
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription className="text-slate-400">Staff attendance for {attendanceDate}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-white">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white">S.N.</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Break Out</TableHead>
                  <TableHead>Break In</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsSource.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-slate-400">{rowsLoading ? 'Loading attendance records...' : 'No attendance records found'}</TableCell>
                  </TableRow>
                ) : rowsSource.map((row, idx) => (
                  <TableRow key={row.employee?.id || idx}>
                    <TableCell>{displayStart + idx}</TableCell>
                    <TableCell className="font-medium text-white"><Button variant="link" className="h-auto px-0 text-emerald-400" onClick={() => row.employee?.id && navigate(`/staff/${row.employee.id}`)} disabled={!row.employee?.id}>{row.employee?.name || 'Unknown'}</Button></TableCell>
                    <TableCell><Badge className={`${row.present ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>{row.present ? 'Present' : 'Absent'}</Badge></TableCell>
                    <TableCell>{formatTime(row.check_in)}</TableCell>
                    <TableCell>{formatTime(row.check_out)}</TableCell>
                    <TableCell>{getBreakSessions(row).length ? getBreakSessions(row).map((s,i)=>(<div key={i}>{formatTime(s.break_out)}</div>)) : <span className="text-slate-500">-</span>}</TableCell>
                    <TableCell>{getBreakSessions(row).length ? getBreakSessions(row).map((s,i)=>(<div key={i}>{formatTime(s.break_in)}</div>)) : <span className="text-slate-500">-</span>}</TableCell>
                    <TableCell className="text-right">{((row.worked_minutes||0)/60).toFixed(2)} hrs</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
        <div>{showAll ? `Showing all ${rowsSource.length} records` : `Showing ${displayStart}–${displayEnd} of ${totalCount} records`}</div>
        {!showAll && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage===1}>Previous</Button>
            <div>Page {currentPage} of {totalPages}</div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} disabled={currentPage===totalPages}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
