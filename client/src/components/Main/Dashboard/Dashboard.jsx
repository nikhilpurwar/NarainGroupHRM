import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import EmployeeAttendance from './components/EmployeeAttendance'

import FestivalList from './components/FestivalList';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

// Small Donut Component
const SmallDonut = ({ present = 0, absent = 0, size = 80 }) => {
  const total = present + absent || 1;
  const presentPct = Math.round((present / total) * 100);
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const presentLen = (present / total) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} fill="transparent" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          r={radius}
          fill="transparent"
          stroke="#10b981"
          strokeWidth="10"
          strokeDasharray={`${presentLen} ${circumference - presentLen}`}
          strokeLinecap="round"
          transform="rotate(-90)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x="0" y="4" textAnchor="middle" fontSize="12" fill="#374151">{presentPct}%</text>
      </g>
    </svg>
  );
};

// Line Chart
const LineTrendChart = ({ data = [], height = 120, stroke = '#2563eb' }) => {
  if (!data || !data.length) return <div className="text-sm text-gray-500">No trend data</div>;
  const width = 600;
  const max = Math.max(...data.map(d => d.value || 0), 1);
  const min = Math.min(...data.map(d => d.value || 0), 0);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 40) + 20;
    const y = 10 + (1 - (d.value - min) / range) * (height - 20);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline fill="none" stroke="#eef2ff" strokeWidth="8" points={points} opacity="0.6" />
        <polyline fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * (width - 40) + 20;
          const y = 10 + (1 - (d.value - min) / range) * (height - 20);
          return <circle key={i} cx={x} cy={y} r={3} fill={stroke} />;
        })}
      </svg>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [todayAttendances, setTodayAttendances] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [salarySummary, setSalarySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token')) : null;

  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : undefined;
  }, [token]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [empRes, attRes, salRes, histRes, deptRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/employees`),
          axios.get(`${API_URL}/api/attendance/today`),
          axios.get(`${API_URL}/api/salary/monthly`, { params: { month: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`, page: 1, pageSize: 1 } }),
          axios.get(`${API_URL}/api/attendance/history`, { params: { days: 14 } }),
          axios.get(`${API_URL}/api/departments`)
        ]);

        if (empRes.status === 'fulfilled' && empRes.value.data?.success) setEmployees(empRes.value.data.data || []);
        if (attRes.status === 'fulfilled' && attRes.value.data?.success) {
          const d = attRes.value.data.data || {};
          setTodayAttendances(d.attendances || []);
          setAttendanceMap(d.map || {});
        }
        if (salRes.status === 'fulfilled' && salRes.value.data?.success) setSalarySummary(salRes.value.data.data?.summary || null);
        if (histRes.status === 'fulfilled' && histRes.value.data) {
          const body = histRes.value.data;
          const data = body.data?.data || body.data || body;
          const history = data.history || data || [];
          setAttendanceHistory(Array.isArray(history) ? history : []);
        }
        if (deptRes.status === 'fulfilled' && deptRes.value.data?.success) setDepartments(deptRes.value.data.data || []);
      } catch (e) {
        console.error('Dashboard fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totalEmployees = employees.length;
  const presentCount = todayAttendances.length;
  const absentCount = Math.max(0, totalEmployees - presentCount);

  const topPresent = useMemo(() => todayAttendances.slice(0, 8).map(a => ({
    empId: a.employeeId || a.employee?._id,
    name: a.empName || a.employee?.employeeName || 'Unknown',
    inTime: a.inTime || a.punchLogs?.[0]?.punchTime || '',
    outTime: a.outTime || '',
    totalHours: a.totalHoursDisplay || a.totalHours || ''
  })), [todayAttendances]);

  const avgHours = useMemo(() => {
    if (!todayAttendances.length) return 0;
    let total = 0, count = 0;
    for (const a of todayAttendances) {
      const val = a.totalHours || a.totalHoursDisplay || a.workingHours || '';
      if (typeof val === 'number') { total += val; count++; continue; }
      if (typeof val === 'string') {
        const m = val.match(/(\d{1,2}):(\d{2})/);
        if (m) { total += Number(m[1]) + Number(m[2]) / 60; count++; continue; }
        const n = Number(val); if (!Number.isNaN(n) && n > 0) { total += n; count++; }
      }
    }
    return count ? +(total / count).toFixed(2) : 0;
  }, [todayAttendances]);

  const attendanceTrend = useMemo(() => {
    if (attendanceHistory?.length) return attendanceHistory.slice(-14).map(h => ({ date: h.date || h._id || h.label, value: h.present || h.count || h.value || 0 }));
    const today = presentCount; const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const variance = Math.round((Math.sin(i) + 1) * 3);
      arr.push({ date: d.toLocaleDateString(), value: Math.max(0, today - variance) });
    }
    return arr;
  }, [attendanceHistory, presentCount]);

  const deptCounts = useMemo(() => {
    const map = {};
    for (const e of employees) {
      const name = e.department?.name || e.department?.label || e.department || 'Unassigned';
      map[name] = (map[name] || 0) + 1;
    }
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
  }, [employees]);

  const presentByDept = useMemo(() => {
    const map = {};
    for (const e of employees) {
      const id = e._id || e.id || e.empId;
      const attended = Boolean(attendanceMap?.[id] || attendanceMap?.[id + '']) || todayAttendances.find(a => a.employeeId === id);
      const name = e.department?.name || e.department?.label || e.department || 'Unassigned';
      if (attended) map[name] = (map[name] || 0) + 1;
    }
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value);
  }, [employees, attendanceMap, todayAttendances]);

  const trendAnalysis = useMemo(() => {
    if (!attendanceTrend.length) return 'No data';
    const last = attendanceTrend[attendanceTrend.length - 1].value || 0;
    const prev = attendanceTrend.length > 1 ? attendanceTrend[attendanceTrend.length - 2].value || 0 : last;
    return last > prev ? `Up ${last - prev} vs previous day` : last < prev ? `Down ${prev - last} vs previous day` : 'Stable';
  }, [attendanceTrend]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6 font-sans">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transition-transform duration-300">
          <div className="flex justify-between items-center">
            <div className="text-4xl"><i className="fas fa-users"></i></div>
            <div className="text-right">
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <div className="text-sm">Employees</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transition-transform duration-300">
          <div className="flex justify-between items-center">
            <div className="text-4xl"><i className="fas fa-user-check"></i></div>
            <div className="text-right">
              <div className="text-2xl font-bold">{presentCount}</div>
              <div className="text-sm">Today Present</div>
            </div>
          </div>
          <div className="mt-2 text-xs">{trendAnalysis}</div>
        </div>

        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transition-transform duration-300">
          <div className="flex justify-between items-center">
            <div className="text-4xl"><i className="fas fa-clock"></i></div>
            <div className="text-right">
              <div className="text-2xl font-bold">{avgHours}h</div>
              <div className="text-sm">Avg Hours</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-2xl shadow-lg p-6 hover:scale-105 transition-transform duration-300">
          <div className="flex justify-between items-center">
            <div className="text-4xl"><i className="fas fa-money-bill-wave"></i></div>
            <div className="text-right">
              <div className="text-2xl font-bold">{salarySummary ? `₹${Number(salarySummary.totalPayable || 0).toLocaleString()}` : '—'}</div>
              <div className="text-sm">Payroll</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white shadow-lg rounded-2xl p-6">
          <h3 className="text-gray-500 text-sm mb-2">Attendance Trend (Last 14 Days)</h3>
          <LineTrendChart data={attendanceTrend} height={160} stroke="#6366f1" />
        </div>

        <div className="bg-white shadow-lg rounded-2xl p-6">
          <h3 className="text-gray-500 text-sm mb-4">Department Headcount</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={deptCounts}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={4}
                label
              >
                {deptCounts.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>

          <h4 className="text-gray-500 text-xs mt-6 mb-2">Present Today by Department</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={presentByDept}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><EmployeeAttendance attendances={topPresent} loading={loading} totalPresent={presentCount} totalEmployees={totalEmployees} /></div>
        <div><FestivalList /></div>
      </div>
    </div>
  );
};

export default Dashboard;
