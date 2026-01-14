import React, { useEffect, useState, useMemo, useRef } from 'react';
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

// Line Chart (enhanced): simple interactive SVG with area fill, Y labels and tooltip
const LineTrendChart = ({ data = [], height = 120, stroke = '#2563eb' }) => {
  const [hover, setHover] = useState(null)
  const chartRef = useRef(null)
  if (!data || !data.length) return <div className="text-sm text-gray-500">No trend data</div>;
  const width = 600;
  const paddingLeft = 36;
  const paddingRight = 12;
  const max = Math.max(...data.map(d => d.value || 0), 1);
  const min = Math.min(...data.map(d => d.value || 0), 0);
  const range = max - min || 1;

  const pointsArr = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * (width - paddingLeft - paddingRight);
    const y = 10 + (1 - (d.value - min) / range) * (height - 20);
    return { x, y, label: d.date || d.label || '', value: d.value || 0 };
  });

  const points = pointsArr.map(p => `${p.x},${p.y}`).join(' ');

  // polygon for area fill (baseline to last point then back to baseline)
  const areaPoints = `${paddingLeft},${height - 8} ${points} ${width - paddingRight},${height - 8}`;

  return (
    <div className="w-full overflow-x-auto relative" ref={chartRef}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Attendance trend chart">
        <defs>
          <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.12" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid lines and Y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
          const yy = 10 + (1 - t) * (height - 20);
          const val = Math.round(min + t * range);
          return (
            <g key={idx}>
              <line x1={paddingLeft} x2={width - paddingRight} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
              <text x={6} y={yy + 4} fontSize={10} fill="#6b7280">{val}</text>
            </g>
          )
        })}

        {/* area fill */}
        <polygon points={areaPoints} fill="url(#trendGrad)" />

        {/* thicker faint stroke for baseline */}
        <polyline fill="none" stroke="#eef2ff" strokeWidth="6" points={points} opacity="0.6" />
        <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />

        {/* points */}
        {pointsArr.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={stroke}
            onMouseEnter={(e) => {
              const rect = chartRef.current?.getBoundingClientRect()
              const offsetX = rect ? e.clientX - rect.left : p.x
              const offsetY = rect ? e.clientY - rect.top : p.y
              setHover({ x: offsetX, y: offsetY, label: p.label, value: p.value })
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* X labels (sparse) */}
        {/* {pointsArr.map((p, i) => {
          // show first, last and 3 intermediate labels
          if (i === 0 || i === pointsArr.length - 1 || i === Math.floor(pointsArr.length / 2)) {
            return <text key={i} x={p.x} y={height - 2} fontSize={10} fill="#6b7280" textAnchor="middle">{p.label}</text>
          }
          return null
        })} */}
      </svg>
      {/* HTML tooltip overlay to sit above other elements */}
      {hover && (() => {
        const containerW = chartRef.current ? chartRef.current.clientWidth : width
        const tooltipW = 140
        const left = Math.min(Math.max(hover.x - 6, 8), Math.max(8, containerW - tooltipW - 8))
        const top = Math.max(hover.y - 66, 8)
        const triangleLeft = Math.max(8, Math.min(tooltipW - 12, Math.round(hover.x - left - 6)))
        return (
          <div
            style={{
              position: 'absolute',
              left: left + 'px',
              top: top + 'px',
              zIndex: 9999,
              pointerEvents: 'none'
            }}
          >
            <div className="bg-white text-xs text-gray-800 shadow-lg rounded-md border px-3 py-2 flex flex-col items-start" style={{ width: tooltipW }}>
              <div className="font-semibold text-sm">{hover.label}</div>
              <div className="text-gray-600">{String(hover.value)}</div>
            </div>
            <div style={{ position: 'absolute', left: triangleLeft + 'px', top: '100%', width: 0, height: 0 }}>
              <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(17,24,39,0.95)' }} />
            </div>
          </div>
        )
      })()}
      <div className="mt-2 text-xs text-gray-500">Hover points to see exact values. Y-axis shows counts.</div>
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
        <div className='lg:col-span-2 flex flex-col gap-6'>
          <div className=" bg-white shadow-lg rounded-2xl p-6">
            <h3 className="text-gray-500 text-sm mb-2">Attendance Trend (Last 14 Days)</h3>
            <LineTrendChart data={attendanceTrend} height={160} stroke="#6366f1" />

          </div>
          <div className="lg:col-span-2"><EmployeeAttendance attendances={topPresent} loading={loading} totalPresent={presentCount} totalEmployees={totalEmployees} /></div>

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
              <Legend verticalAlign="bottom" height={36} />
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
        <div><FestivalList /></div>
      </div>
    </div>
  );
};

export default Dashboard;
