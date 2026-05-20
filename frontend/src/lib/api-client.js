import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';

const createClient = () => {
  const instance = axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  return instance;
};

export const apiClient = {
  request: (url, opts) => createClient().request({ url, ...opts }).then(r => r.data),
  auth: {
    getCurrentUser: async () => {
      const res = await createClient().get('/userauth/user-info/');
      return res.data;
    },
  },
  enterprise: {
    hierarchy: async () => {
      const res = await createClient().get('/enterprise/api/hierarchy/');
      return res.data;
    },
    updatePreference: async (enterpriseId, data) => {
      const res = await createClient().post(
        `/enterprise/api/enterprise/${enterpriseId}/update-preference/`,
        data
      );
      return res.data;
    },
  },
  dashboard: {
    getAttendance: async (branchId, departmentId, dateFormat) => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (departmentId) params.append('department_id', String(departmentId));
      if (dateFormat) params.append('date_format', String(dateFormat));
      const url = `/attendance/api/daily/?${params.toString()}`;
      const res = await createClient().get(url);
      return res.data;
    },
    getLateArrivals: async (branchId, departmentId, attendance_date, date_format) => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (departmentId) params.append('department_id', String(departmentId));
      if (attendance_date) params.append('attendance_date', String(attendance_date));
      if (date_format) params.append('date_format', String(date_format));
      const url = `/attendance/api/dashboard/late-arrivals/?${params.toString()}`;
      const res = await createClient().get(url);
      return res.data;
    },
    getEarlyDepartures: async (branchId, departmentId, attendance_date, date_format) => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (departmentId) params.append('department_id', String(departmentId));
      if (attendance_date) params.append('attendance_date', String(attendance_date));
      if (date_format) params.append('date_format', String(date_format));
      const url = `/attendance/api/dashboard/early-departures/?${params.toString()}`;
      const res = await createClient().get(url);
      return res.data;
    },
    getMonthlySummary: async ({ branchId, departmentId, startDate, endDate, dateFormat }) => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (departmentId) params.append('department_id', String(departmentId));
      if (startDate) params.append('start_date', String(startDate));
      if (endDate) params.append('end_date', String(endDate));
      if (dateFormat) params.append('date_format', String(dateFormat));
      const url = `/attendance/api/reports/monthly-summary/?${params.toString()}`;
      const res = await createClient().get(url);
      return res.data;
    },
    getMonthlySummaryDetailed: async ({ branchId, departmentId, startDate, endDate, dateFormat }) => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (departmentId) params.append('department_id', String(departmentId));
      if (startDate) params.append('start_date', String(startDate));
      if (endDate) params.append('end_date', String(endDate));
      if (dateFormat) params.append('date_format', String(dateFormat));
      const url = `/attendance/api/reports/monthly-summary-detailed/?${params.toString()}`;
      const res = await createClient().get(url);
      return res.data;
    },
  },
};

export default apiClient;
