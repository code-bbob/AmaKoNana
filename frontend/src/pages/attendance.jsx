"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAxios from '@/utils/useAxios';
import Sidebar from '@/components/allsidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  CalendarDays,
  Clock3,
  Download,
  ListChecks,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';

const formatTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (value) => {
  if (!value) return 'Today';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
};

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const eventLabel = (type) => {
  const labels = {
    0: 'Check-in',
    1: 'Check-out',
    2: 'Break out',
    3: 'Break in',
    4: 'OT in',
    5: 'OT out',
  };
  return labels[type] || 'Event';
};

const eventColor = (type) => {
  const colors = {
    0: 'text-emerald-300',
    1: 'text-rose-300',
    2: 'text-amber-300',
    3: 'text-emerald-300',
    4: 'text-indigo-300',
    5: 'text-indigo-300',
  };
  return colors[type] || 'text-slate-300';
};

export default function AttendancePage({ reportMode = false }) {
  const api = useAxios();
  const { branchId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [branchPayload, setBranchPayload] = useState(null);
  const [departmentPayload, setDepartmentPayload] = useState(null);
  const [lateArrivals, setLateArrivals] = useState([]);
  const [earlyDepartures, setEarlyDepartures] = useState([]);
  const [activeTab, setActiveTab] = useState(reportMode ? 'details' : 'overview');

  useEffect(() => {
    setActiveTab(reportMode ? 'details' : 'overview');
  }, [reportMode]);

  useEffect(() => {
    let cancelled = false;

    const loadAttendance = async () => {
      if (!branchId) {
        setError('Missing branch id');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = selectedDepartmentId
          ? await api.get(`attendance/api/dashboard/department/${selectedDepartmentId}/`)
          : await api.get(`attendance/api/dashboard/branch/${branchId}/`);

        if (cancelled) return;

        if (selectedDepartmentId) {
          setDepartmentPayload(response.data);
          setBranchPayload(null);
        } else {
          setBranchPayload(response.data);
          setDepartmentPayload(null);
        }

        const attendanceDate = response.data?.attendance_date || getTodayInputValue();
        const filters = new URLSearchParams();
        filters.set('branch_id', branchId);
        if (selectedDepartmentId) {
          filters.set('department_id', String(selectedDepartmentId));
        }
        filters.set('attendance_date', attendanceDate);

        const [lateResponse, earlyResponse] = await Promise.all([
          api.get(`attendance/api/dashboard/late-arrivals/?${filters.toString()}`),
          api.get(`attendance/api/dashboard/early-departures/?${filters.toString()}`),
        ]);

        if (cancelled) return;

        setLateArrivals(Array.isArray(lateResponse.data?.late_arrivals) ? lateResponse.data.late_arrivals : []);
        setEarlyDepartures(Array.isArray(earlyResponse.data?.early_departures) ? earlyResponse.data.early_departures : []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err.message || 'Failed to load attendance data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [ branchId, selectedDepartmentId]);

  const activePayload = selectedDepartmentId ? departmentPayload : branchPayload;
  const activeNode = selectedDepartmentId ? activePayload?.department : activePayload?.branch;
  const attendanceRows = activeNode?.attendance_rows || [];
  const stats = activeNode?.stats || {};
  const attendanceDate = activePayload?.attendance_date;
  const attendanceLabel = activeNode?.name || (selectedDepartmentId ? 'Department Attendance' : 'Branch Attendance');

  const presentCount = stats.present_today ?? attendanceRows.filter((row) => row.present).length;
  const totalEmployees = stats.total_employees ?? attendanceRows.length;
  const absentCount = stats.absent_today ?? Math.max(totalEmployees - presentCount, 0);
  const avgWorkHours = Number(stats.average_worked_hours ?? 0).toFixed(1);

  const pieData = [
    { name: 'Present', value: presentCount, color: '#34d399' },
    { name: 'Absent', value: absentCount, color: '#fb7185' },
  ];

  const topWorkers = useMemo(() => {
    return [...attendanceRows]
      .filter((row) => row.present)
      .sort((a, b) => (b.worked_minutes || 0) - (a.worked_minutes || 0))
      .slice(0, 5)
      .map((row) => ({
        name: row.employee?.name?.split(' ')?.[0] || 'Unknown',
        hours: Number(((row.worked_minutes || 0) / 60).toFixed(1)),
      }));
  }, [attendanceRows]);

  const recentActivities = useMemo(() => {
    return attendanceRows
      .map((row) => {
        const lastEventTime = row.summary?.last_event_time;
        const lastEventType = row.summary?.last_event_type;
        if (!lastEventTime || typeof lastEventType !== 'number') return null;

        return {
          id: row.employee?.id || 0,
          name: row.employee?.name || 'Unknown',
          eventTime: lastEventTime,
          eventType: lastEventType,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime())
      .slice(0, 6);
  }, [attendanceRows]);

  const earliestArrivals = useMemo(() => {
    return attendanceRows
      .filter((row) => row.check_in)
      .map((row) => ({
        id: row.employee?.id || 0,
        name: row.employee?.name || 'Unknown',
        checkIn: row.check_in,
      }))
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .slice(0, 6);
  }, [attendanceRows]);

  const detailRows = attendanceRows.slice(0, 12);

  const handleDownloadCsv = () => {
    if (!detailRows.length) return;

    const csv = [
      ['Employee', 'Status', 'Check In', 'Check Out', 'Worked Minutes'],
      ...detailRows.map((row) => [
        row.employee?.name || 'Unknown',
        row.present ? 'Present' : 'Absent',
        row.check_in || '',
        row.check_out || '',
        row.worked_minutes || 0,
      ]),
    ]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950 text-white">
        <Sidebar className="hidden lg:block w-64 flex-shrink-0" />
        <div className="flex-1 p-4 px-8 lg:p-6 lg:ml-64">
          <div className="space-y-6">
            <div className="h-10 w-64 rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-6 w-96 rounded-lg bg-slate-800 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-2xl bg-slate-800 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
              <div className="h-[340px] xl:col-span-4 rounded-2xl bg-slate-800 animate-pulse" />
              <div className="h-[340px] xl:col-span-3 rounded-2xl bg-slate-800 animate-pulse" />
            </div>
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
                <UserX className="h-5 w-5" />
                Attendance data unavailable
              </CardTitle>
              <CardDescription className="text-slate-300">{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-300">
                Make sure the attendance backend is running and that this branch belongs to your enterprise.
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-slate-700 bg-transparent" onClick={() => navigate('/')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
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
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
              <CalendarDays className="h-4 w-4" />
              Attendance
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {reportMode ? 'Attendance Report' : 'Attendance Overview'}
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              {attendanceLabel} for {formatDateLabel(attendanceDate)}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {selectedDepartmentId ? (
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-900/70 text-white hover:bg-slate-800"
                onClick={() => setSelectedDepartmentId(null)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Branch
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-900/70 text-white hover:bg-slate-800"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            )}
            <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={handleDownloadCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        <div className="space-y-6">
          <div className="flex gap-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'overview'
                  ? 'border-b-sky-400 text-sky-300'
                  : 'border-b-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'details'
                  ? 'border-b-sky-400 text-sky-300'
                  : 'border-b-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <ListChecks className="h-4 w-4" />
              Details
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard title="Total Workforce" value={totalEmployees} icon={<Users className="h-4 w-4 text-slate-400" />} helper="Branch-wide headcount" />
              <MetricCard title="Present Today" value={presentCount} icon={<UserCheck className="h-4 w-4 text-emerald-400" />} helper={`${totalEmployees ? Math.round((presentCount / totalEmployees) * 100) : 0}% attendance rate`} />
              <MetricCard title="Absent Today" value={absentCount} icon={<UserX className="h-4 w-4 text-rose-400" />} helper={absentCount === 0 ? 'Perfect attendance' : 'Needs follow-up'} />
              <MetricCard title="Avg Daily Hours" value={`${avgWorkHours}h`} icon={<Clock3 className="h-4 w-4 text-sky-400" />} helper="Across currently visible employees" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Late Arrivals</CardTitle>
                    <CardDescription className="text-slate-400">Checked in after scheduled time</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-300">Today</Badge>
                </CardHeader>
                <CardContent>
                  {lateArrivals.length === 0 ? (
                    <p className="text-sm text-slate-400">No late arrivals for this view.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400">Name</TableHead>
                            <TableHead className="text-slate-400">Sched</TableHead>
                            <TableHead className="text-slate-400">Check-in</TableHead>
                            <TableHead className="text-right text-slate-400">Late</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lateArrivals.slice(0, 5).map((item, index) => (
                            <TableRow key={`${item.employee?.id}-${index}`} className="border-slate-800">
                              <TableCell className="font-medium text-white">{item.employee?.name || 'Unknown'}</TableCell>
                              <TableCell className="text-slate-300">{formatTime(item.scheduled_arrival)}</TableCell>
                              <TableCell className="text-rose-300">{formatTime(item.check_in)}</TableCell>
                              <TableCell className="text-right font-medium text-rose-300">{item.late_minutes?.toFixed?.(1) || '0.0'}m</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Early Departures</CardTitle>
                    <CardDescription className="text-slate-400">Checked out before scheduled time</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-300">Today</Badge>
                </CardHeader>
                <CardContent>
                  {earlyDepartures.length === 0 ? (
                    <p className="text-sm text-slate-400">No early departures for this view.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400">Name</TableHead>
                            <TableHead className="text-slate-400">Out</TableHead>
                            <TableHead className="text-slate-400">Sched</TableHead>
                            <TableHead className="text-right text-slate-400">Early</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earlyDepartures.slice(0, 5).map((item, index) => (
                            <TableRow key={`${item.employee?.id}-${index}`} className="border-slate-800">
                              <TableCell className="font-medium text-white">{item.employee?.name || 'Unknown'}</TableCell>
                              <TableCell className="text-slate-300">{formatTime(item.check_out)}</TableCell>
                              <TableCell className="text-slate-300">{formatTime(item.scheduled_departure)}</TableCell>
                              <TableCell className="text-right font-medium text-rose-300">{item.early_minutes?.toFixed?.(1) || '0.0'}m</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
              <Card className="xl:col-span-4 border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
                <CardHeader>
                  <CardTitle>Top Contributions</CardTitle>
                  <CardDescription className="text-slate-400">Highest active hours worked today</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {topWorkers.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topWorkers} margin={{ top: 12, right: 8, left: 0, bottom: 8 }}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                        <ChartTooltip cursor={{ fill: 'rgba(15, 23, 42, 0.2)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #1f2937', background: '#0f172a', color: '#fff' }} />
                        <Bar dataKey="hours" radius={[8, 8, 0, 0]} fill="#38bdf8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">No active work hours recorded yet.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="xl:col-span-3 border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
                <CardHeader>
                  <CardTitle>Workforce Status</CardTitle>
                  <CardDescription className="text-slate-400">Present vs absent ratio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={4} dataKey="value">
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <ChartTooltip formatter={(value) => [`${value} employees`, 'Count']} contentStyle={{ borderRadius: '12px', border: '1px solid #1f2937', background: '#0f172a', color: '#fff' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                      Present ({presentCount})
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-400" />
                      Absent ({absentCount})
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {!selectedDepartmentId && Array.isArray(activeNode?.departments) && activeNode.departments.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
                <CardHeader>
                  <CardTitle>Departments</CardTitle>
                  <CardDescription className="text-slate-400">Drill into a department for a focused attendance view</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeNode.departments.map((department) => (
                      <button
                        key={department.id}
                        type="button"
                        onClick={() => setSelectedDepartmentId(department.id)}
                        className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-left transition hover:border-sky-400/60 hover:bg-slate-900"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{department.name}</div>
                            <div className="text-xs text-slate-400">Department summary</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-300">
                          <span>Employees</span>
                          <span className="font-semibold text-white">{department.stats?.total_employees || 0}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                          <span>Present</span>
                          <span className="font-semibold text-emerald-300">{department.stats?.present_today || 0}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                          <span>Avg Hours</span>
                          <span className="font-semibold text-white">{Number(department.stats?.average_worked_hours || 0).toFixed(1)}h</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Attendance Table</CardTitle>
                  <CardDescription className="text-slate-400">Visible employee rows for this branch or department</CardDescription>
                </div>
                <Badge variant="outline" className="border-slate-700 text-slate-300">{detailRows.length} rows</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-950/80">
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="pl-6 text-slate-400">Employee</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="hidden md:table-cell text-slate-400">First In</TableHead>
                        <TableHead className="hidden md:table-cell text-slate-400">Last Out</TableHead>
                        <TableHead className="text-right pr-6 text-slate-400">Logged Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRows.length === 0 ? (
                        <TableRow className="border-slate-800">
                          <TableCell colSpan={5} className="py-8 text-center text-slate-400">No attendance rows found.</TableCell>
                        </TableRow>
                      ) : (
                        detailRows.map((row) => (
                          <TableRow key={row.employee?.id} className="border-slate-800">
                            <TableCell className="pl-6">
                              <div className="font-medium text-white">{row.employee?.name || 'Unknown'}</div>
                              <div className="text-xs text-slate-400">{row.employee?.employee_code || '-'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={row.present ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/30 bg-rose-400/10 text-rose-300'}>
                                {row.present ? 'Present' : 'Absent'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-slate-300">{formatTime(row.check_in)}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-slate-300">{formatTime(row.check_out)}</TableCell>
                            <TableCell className="pr-6 text-right font-mono text-sm text-slate-200">{((row.worked_minutes || 0) / 60).toFixed(1)}h</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription className="text-slate-400">Latest check-ins, check-outs, and breaks</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivities.length === 0 ? (
                    <p className="text-sm text-slate-400">No recent activity yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400">Name</TableHead>
                            <TableHead className="text-slate-400">Event</TableHead>
                            <TableHead className="text-right text-slate-400">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentActivities.map((item) => (
                            <TableRow key={`${item.id}-${item.eventTime}`} className="border-slate-800">
                              <TableCell className="font-medium text-white">{item.name}</TableCell>
                              <TableCell className={eventColor(item.eventType)}>{eventLabel(item.eventType)}</TableCell>
                              <TableCell className="text-right text-slate-300">{formatTime(item.eventTime)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
                <CardHeader>
                  <CardTitle>Arrivals Leaderboard</CardTitle>
                  <CardDescription className="text-slate-400">Earliest check-ins for this view</CardDescription>
                </CardHeader>
                <CardContent>
                  {earliestArrivals.length === 0 ? (
                    <p className="text-sm text-slate-400">No check-ins yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400">Name</TableHead>
                            <TableHead className="text-right text-slate-400">Check-in</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earliestArrivals.map((item) => (
                            <TableRow key={`${item.id}-${item.checkIn}`} className="border-slate-800">
                              <TableCell className="font-medium text-white">{item.name}</TableCell>
                              <TableCell className="text-right font-medium text-emerald-300">{formatTime(item.checkIn)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, helper }) {
  return (
    <Card className="border-slate-800 bg-slate-900/70 text-white shadow-xl shadow-black/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
          <div className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-2 text-slate-300">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium text-slate-400">{helper}</p>
      </CardContent>
    </Card>
  );
}