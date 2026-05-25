'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAxios from '@/utils/useAxios';
import Sidebar from '@/components/allsidebar';

// shadcn UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Icons
import { ArrowLeft, Loader, Download, FilterX, Filter } from 'lucide-react';

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

const getBreakSessions = (row) => {
  if (Array.isArray(row.break_sessions) && row.break_sessions.length > 0) {
    return row.break_sessions;
  }
  return [];
};

const applyBreakEventToSessions = (sessions, eventType, eventTime) => {
  const nextSessions = Array.isArray(sessions) ? [...sessions] : [];
  const hasBreakOutAtTime = nextSessions.some((session) => session.break_out === eventTime);
  const hasBreakInAtTime = nextSessions.some((session) => session.break_in === eventTime);

  if (eventType === 2) {
    if (hasBreakOutAtTime) {
      return nextSessions;
    }
    const lastSession = nextSessions[nextSessions.length - 1];
    if (!lastSession || lastSession.break_in) {
      nextSessions.push({ break_out: eventTime, break_in: null });
    } else {
      lastSession.break_out = eventTime;
    }
  }

  if (eventType === 3) {
    if (hasBreakInAtTime) {
      return nextSessions;
    }
    const lastSession = nextSessions[nextSessions.length - 1];
    if (lastSession && !lastSession.break_in) {
      lastSession.break_in = eventTime;
    } else {
      nextSessions.push({ break_out: null, break_in: eventTime });
    }
  }

  return nextSessions;
};

function AttendanceReportContent() {
  const api = useAxios();
  const { branchId } = useParams();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [allAttendanceRows, setAllAttendanceRows] = useState([]);
  const [lateArrivals, setLateArrivals] = useState([]);
  const [earlyDepartures, setEarlyDepartures] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [detailedMonthly, setDetailedMonthly] = useState([]);
  const [selectedTab, setSelectedTab] = useState('attendance');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showAllLoading, setShowAllLoading] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(null);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const seenEventKeysRef = useRef(new Set());

  const applyEventToRows = (prevRows, payload) => {
    if (!payload) return { rows: prevRows, added: false };
    const empId = Number(payload.employee_id);
    if (!empId) return { rows: prevRows, added: false };
    
    const eventType = Number(payload.event_type);
    const eventTime = payload.event_time;
    const authoritativeFirstCheckIn = payload.first_check_in ?? null;
    const authoritativeLastCheckOut = payload.last_check_out ?? null;
    const authoritativeWorkedMinutes =
      typeof payload.worked_minutes !== 'undefined' ? Number(payload.worked_minutes) : null;

    const next = [...prevRows];
    let found = false;

    for (let i = 0; i < next.length; i++) {
      const row = next[i];
      if (row.employee && row.employee.id === empId) {
        found = true;
        row.present = true;
        
        if (authoritativeFirstCheckIn) {
          row.check_in = authoritativeFirstCheckIn;
        } else if (eventType === 0) {
          row.check_in = eventTime;
        }

        if (authoritativeLastCheckOut) {
          row.check_out = authoritativeLastCheckOut;
        } else if (eventType === 1) {
          row.check_out = eventTime;
        }

        if (authoritativeWorkedMinutes !== null) {
          row.worked_minutes = authoritativeWorkedMinutes;
        }

        if (eventType === 2 || eventType === 3) {
          row.break_sessions = applyBreakEventToSessions(row.break_sessions, eventType, eventTime);
        }
        if (eventType === 2) row.break_out = eventTime;
        if (eventType === 3) row.break_in = eventTime;
        if (eventType === 4) row.ot_in = eventTime;
        if (eventType === 5) row.ot_out = eventTime;
        break;
      }
    }

    if (!found) {
      next.unshift({
        employee: {
          id: empId,
          employee_code: String(payload.employee_code || empId),
          name: payload.employee_name || 'Unknown',
        },
        present: true,
        check_in: eventType === 0 ? eventTime : null,
        check_out: eventType === 1 ? eventTime : null,
        break_sessions:
          eventType === 2
            ? [{ break_out: eventTime, break_in: null }]
            : eventType === 3
              ? [{ break_out: null, break_in: eventTime }]
              : [],
        break_out: eventType === 2 ? eventTime : null,
        break_in: eventType === 3 ? eventTime : null,
        ot_in: eventType === 4 ? eventTime : null,
        ot_out: eventType === 5 ? eventTime : null,
        worked_minutes: authoritativeWorkedMinutes ?? 0,
      });
    }

    return { rows: next, added: !found };
  };

  // Initial load
  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      if (!branchId) {
        setError('Missing branch ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load dashboard data to get attendance date and stats
        const response = await api.get(`attendance/api/dashboard/branch/${branchId}/`);

        if (cancelled) return;

        setAttendanceDate(response.data?.attendance_date);
        setBranches(response.data?.branches || []);
        setDepartments(response.data?.departments || []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err.message || 'Failed to load attendance data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  // Load paginated rows
  useEffect(() => {
    if (!branchId || showAll) return;

    let cancelled = false;

    const loadRows = async () => {
      try {
        setRowsLoading(true);
        const params = new URLSearchParams();
        params.append('branch_id', String(branchId));
        if (selectedDepartmentId) {
          params.append('department_id', String(selectedDepartmentId));
        }
        params.append('page', String(currentPage));

        const response = await api.get(`attendance/api/attendance/rows/?${params.toString()}`);

        if (cancelled) return;

        setAttendanceRows(Array.isArray(response.data?.attendance_rows) ? response.data.attendance_rows : []);
        setTotalCount(typeof response.data?.count === 'number' ? response.data.count : response.data?.attendance_rows?.length || 0);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load attendance rows:', err);
        }
      } finally {
        if (!cancelled) setRowsLoading(false);
      }
    };

    loadRows();

    return () => {
      cancelled = true;
    };
  }, [branchId, selectedDepartmentId, currentPage, showAll]);

  // Load tab-specific data when tab becomes active
  useEffect(() => {
    if (!branchId) return;

    let cancelled = false;
    const params = new URLSearchParams();
    params.append('branch_id', String(branchId));
    if (selectedDepartmentId) params.append('department_id', String(selectedDepartmentId));

    const loadLate = async () => {
      try {
        const res = await api.get(`attendance/api/dashboard/late-arrivals/?${params.toString()}`);
        if (!cancelled) setLateArrivals(Array.isArray(res.data?.late_arrivals) ? res.data.late_arrivals : []);
      } catch (err) {
        if (!cancelled) console.error('Failed to load late arrivals:', err);
      }
    };

    const loadEarly = async () => {
      try {
        const res = await api.get(`attendance/api/dashboard/early-departures/?${params.toString()}`);
        if (!cancelled) setEarlyDepartures(Array.isArray(res.data?.early_departures) ? res.data.early_departures : []);
      } catch (err) {
        if (!cancelled) console.error('Failed to load early departures:', err);
      }
    };

    const loadMonthly = async () => {
      try {
        const res = await api.get(`attendance/api/dashboard/monthly-reports/?${params.toString()}`);
        if (!cancelled) setMonthlyReports(Array.isArray(res.data?.reports) ? res.data.reports : []);
      } catch (err) {
        if (!cancelled) console.info('Monthly reports not available:', err?.message || err);
      }
    };

    const loadDetailed = async () => {
      try {
        const res = await api.get(`attendance/api/dashboard/monthly-details/?${params.toString()}`);
        if (!cancelled) setDetailedMonthly(Array.isArray(res.data?.details) ? res.data.details : []);
      } catch (err) {
        if (!cancelled) console.info('Detailed monthly not available:', err?.message || err);
      }
    };

    if (selectedTab === 'late-arrivals') loadLate();
    if (selectedTab === 'early-departure') loadEarly();
    if (selectedTab === 'monthly-reports') loadMonthly();
    if (selectedTab === 'detailed-monthly') loadDetailed();

    return () => {
      cancelled = true;
    };
  }, [selectedTab, branchId, selectedDepartmentId]);

  // Real-time SSE updates
  useEffect(() => {
    if (!branchId) return;
    
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${baseUrl}/attendance/api/events/stream/`;
    let es = null;

    try {
      es = new EventSource(url);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const eventId = payload?.event_id;
          const fallbackKey = `${payload?.employee_id ?? 'x'}:${payload?.event_type ?? 'x'}:${payload?.event_time ?? 'x'}`;
          const eventKey = eventId ? `id:${String(eventId)}` : `sig:${fallbackKey}`;

          if (seenEventKeysRef.current.has(eventKey)) {
            return;
          }
          seenEventKeysRef.current.add(eventKey);
          if (seenEventKeysRef.current.size > 500) {
            const keys = Array.from(seenEventKeysRef.current);
            seenEventKeysRef.current = new Set(keys.slice(keys.length - 250));
          }

          setAttendanceRows((prev) => {
            const { rows, added } = applyEventToRows(prev, payload);
            if (added) setTotalCount((count) => count + 1);
            return rows;
          });

          if (showAll) {
            setAllAttendanceRows((prev) => applyEventToRows(prev, payload).rows);
          }
        } catch (err) {
          // Ignore malformed events
        }
      };
      es.onerror = () => {
        // Ignore SSE errors; API polling still works
      };
    } catch (err) {
      // SSE initialization failed; API polling still works
    }

    return () => {
      if (es) es.close();
    };
  }, [branchId, showAll]);

  // Load all records
  const handleShowAll = async () => {
    try {
      setShowAllLoading(true);
      const params = new URLSearchParams();
      params.append('branch_id', String(branchId));
      if (selectedDepartmentId) {
        params.append('department_id', String(selectedDepartmentId));
      }

      const baseQuery = params.toString();
      let page = 1;
      const results = [];

      while (true) {
        const pageParams = new URLSearchParams(baseQuery);
        pageParams.append('page', String(page));
        
        const response = await api.get(`attendance/api/attendance/rows/?${pageParams.toString()}`);
        const pageRows = Array.isArray(response.data?.attendance_rows) ? response.data.attendance_rows : [];
        results.push(...pageRows);

        if (pageRows.length === 0 || !response.data?.pagination?.next) {
          break;
        }

        page += 1;
      }

      setAllAttendanceRows(results);
      setShowAll(true);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load all attendance records:', err);
    } finally {
      setShowAllLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    let rows = [];
    if (selectedTab === 'attendance') rows = showAll ? allAttendanceRows : attendanceRows;
    else if (selectedTab === 'late-arrivals') rows = lateArrivals;
    else if (selectedTab === 'early-departure') rows = earlyDepartures;
    else if (selectedTab === 'monthly-reports') rows = monthlyReports;
    else if (selectedTab === 'detailed-monthly') rows = detailedMonthly;

    if (!rows || rows.length === 0) return;

    const csv = [
      ['S.N.', 'Employee', 'Status', 'Check In', 'Check Out', 'Break Out', 'Break In', 'Hours Worked'],
      ...rows.map((row, idx) => [
        idx + 1,
        row.employee?.name || row.name || 'Unknown',
        row.present ? 'Present' : 'Absent',
        row.check_in || row.checkIn || '',
        row.check_out || row.checkOut || '',
        (getBreakSessions(row).map((s) => formatTime(s.break_out)).join('; ') || '-'),
        (getBreakSessions(row).map((s) => formatTime(s.break_in)).join('; ') || '-'),
        (((row.worked_minutes || row.workedMinutes) || 0) / 60).toFixed(2),
      ]),
    ]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${attendanceDate || selectedTab || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pagination logic
  const itemsPerPage = 30;
  const rowsSource = showAll ? allAttendanceRows : attendanceRows;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const displayStart = showAll ? (rowsSource.length ? 1 : 0) : (totalCount ? startIndex + 1 : 0);
  const displayEnd = showAll ? Math.min(rowsSource.length, endIndex) : Math.min(startIndex + rowsSource.length, totalCount || rowsSource.length);

  // Table rows depending on active tab
  const tableRows = selectedTab === 'attendance' ? rowsSource : (selectedTab === 'late-arrivals' ? lateArrivals : (selectedTab === 'early-departure' ? earlyDepartures : (selectedTab === 'monthly-reports' ? monthlyReports : detailedMonthly)));
  const tableDisplayStart = selectedTab === 'attendance' ? displayStart : 1;
  const exportDisabled = !tableRows || tableRows.length === 0;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
        <div className="flex-1 p-4 px-8 lg:p-6 lg:ml-64">
          <div className="space-y-6">
            <div className="h-10 w-64 rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-96 rounded-lg bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
        <div className="flex-1 p-4 px-8 lg:p-6 lg:ml-64 flex items-center justify-center">
          <Card className="w-full max-w-xl border-rose-500/20 bg-slate-900/80 text-white shadow-2xl">
            <CardHeader>
              <CardTitle className="text-rose-300 flex items-center gap-2">
                <FilterX className="h-5 w-5" />
                Error loading attendance report
              </CardTitle>
              <CardDescription className="text-slate-300">{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="border-slate-700 bg-transparent text-white hover:bg-slate-800"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
      <div className="flex-1 p-4 px-8 lg:p-6 lg:ml-64 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Attendance Report</h1>
              </div>
              <p className="text-sm text-slate-400">
                Complete daily attendance records for {attendanceDate || 'today'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <Button
                  onClick={handleDownloadCsv}
                  disabled={exportDisabled}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2">
                {[
                  { key: 'attendance', label: 'Daily' },
                  { key: 'late-arrivals', label: 'Late Arrivals' },
                  { key: 'early-departure', label: 'Early Departures' },
                  { key: 'monthly-reports', label: 'Monthly Reports' },
                  { key: 'detailed-monthly', label: 'Detailed Monthly' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setSelectedTab(tab.key);
                      setShowAll(false);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${selectedTab === tab.key ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-300 hover:bg-slate-800'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Department
              </label>
              <select
                value={selectedDepartmentId || ''}
                onChange={(e) => {
                  setSelectedDepartmentId(e.target.value ? parseInt(e.target.value) : null);
                  setCurrentPage(1);
                }}
                className="mt-2 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedDepartmentId && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDepartmentId(null);
                    setCurrentPage(1);
                  }}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 gap-2"
                >
                  <FilterX className="h-4 w-4" />
                  Clear Filter
                </Button>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-700 bg-slate-900/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">Total Records</p>
                  <p className="text-2xl font-bold text-white">{totalCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-900/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">Current Page</p>
                  <p className="text-2xl font-bold text-white">{showAll ? 'All' : currentPage}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-900/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">Showing</p>
                  <p className="text-2xl font-bold text-white">{rowsSource.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-900/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">Status</p>
                  <p className="text-xl font-bold">
                    {rowsLoading ? (
                      <Loader className="h-5 w-5 animate-spin mx-auto text-emerald-400" />
                    ) : (
                      <span className="text-emerald-400">Ready</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Table Card */}
          <Card className="border-slate-700 bg-slate-900/50 shadow-lg">
            <CardHeader className="border-b border-slate-700 flex flex-row items-center justify-between">
              <div>
                <CardTitle className=" font-semibold">Attendance Records</CardTitle>
                <CardDescription className="text-slate-400">
                  Staff attendance for {attendanceDate}
                </CardDescription>
              </div>
              <Button
                onClick={handleShowAll}
                disabled={selectedTab !== 'attendance' || showAllLoading || showAll}
                variant={showAll ? 'secondary' : 'outline'}
                className={`rounded-lg gap-2 ${
                  showAll
                    ? 'bg-slate-800 border-slate-700 text-black'
                    : 'border-slate-700 bg-transparent text-black hover:bg-slate-800'
                }`}
              >
                {showAllLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : showAll ? (
                  'Showing All'
                ) : (
                  'Show All'
                )}
              </Button>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Table */}
                <div className="overflow-x-auto border border-slate-700 rounded-lg">
                  <Table>
                    <TableHeader className="bg-slate-800/50 border-b border-slate-700">
                      <TableRow className="border-slate-700 hover:bg-slate-800/30">
                        <TableHead className="text-slate-300">S.N.</TableHead>
                        <TableHead className="text-slate-300">Employee</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Check In</TableHead>
                        <TableHead className="text-slate-300">Check Out</TableHead>
                        <TableHead className="text-slate-300">Break Out</TableHead>
                        <TableHead className="text-slate-300">Break In</TableHead>
                        <TableHead className="text-slate-300 text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!tableRows || tableRows.length === 0) ? (
                        <TableRow className="border-slate-700 hover:bg-slate-800/30">
                          <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                            {rowsLoading ? 'Loading attendance records...' : 'No attendance records found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        tableRows.map((row, idx) => (
                          <TableRow key={row.employee?.id || idx} className="border-slate-700 hover:bg-slate-800/30">
                            <TableCell className="text-slate-300">{tableDisplayStart + idx}</TableCell>
                            <TableCell className="font-medium text-white">
                              <Button
                                variant="link"
                                className="h-auto px-0 text-emerald-400 hover:text-emerald-300"
                                onClick={() => {
                                  if (row.employee?.id) {
                                    navigate(`/staff/${row.employee.id}`);
                                  }
                                }}
                                disabled={!row.employee?.id}
                              >
                                {row.employee?.name || 'Unknown'}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${
                                  row.present
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {row.present ? 'Present' : 'Absent'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300">
                                {formatTime(row.check_in || row.checkIn)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatTime(row.check_out || row.checkOut)}
                            </TableCell>
                            <TableCell>
                              {getBreakSessions(row).length > 0 ? (
                                <div className="space-y-1">
                                  {getBreakSessions(row).map((session, sessionIndex) => (
                                    <div key={`${row.employee?.id || idx}-break-out-${sessionIndex}`} className="text-slate-300">
                                      {formatTime(session.break_out)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getBreakSessions(row).length > 0 ? (
                                <div className="space-y-1">
                                  {getBreakSessions(row).map((session, sessionIndex) => (
                                    <div key={`${row.employee?.id || idx}-break-in-${sessionIndex}`} className="text-slate-300">
                                      {formatTime(session.break_in)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-slate-300">
                              {(((row.worked_minutes || row.workedMinutes) || 0) / 60).toFixed(2)} hrs
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-700 pt-6">
                  <div className="text-sm text-slate-400">
                    {showAll ? (
                      <>Showing all {rowsSource.length} records</>
                    ) : (
                      <>
                        Showing {displayStart}–{displayEnd} of {totalCount} records
                      </>
                    )}
                  </div>

                  {selectedTab === 'attendance' && !showAll && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 rounded-lg"
                      >
                        Previous
                      </Button>
                      <div className="text-sm font-medium text-slate-300">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 rounded-lg"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default AttendanceReportContent;
