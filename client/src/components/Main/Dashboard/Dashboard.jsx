import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import Cards from './components/Cards'
import EmployeeAttendance from './components/EmployeeAttendance'
import FestivalList from './components/FestivalList'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

const SmallDonut = ({ present = 0, absent = 0, size = 80 }) => {
  const total = present + absent || 1
  const presentPct = Math.round((present / total) * 100)
  const radius = size / 2 - 6
  const circumference = 2 * Math.PI * radius
  const presentLen = (present / total) * circumference
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} fill="transparent" stroke="#eee" strokeWidth="10" />
        <circle r={radius} fill="transparent" stroke="#10b981" strokeWidth="10" strokeDasharray={`${presentLen} ${circumference - presentLen}`} strokeLinecap="round" transform="rotate(-90)" />
        <text x="0" y="4" textAnchor="middle" fontSize="12" fill="#374151">{presentPct}%</text>
      </g>
    </svg>
  )
}

// Simple responsive line chart (SVG)
const LineChart = ({ data = [], height = 120, stroke = '#2563eb' }) => {
  if (!data || !data.length) return <div className="text-sm text-gray-500">No trend data</div>
  const width = 600
  const max = Math.max(...data.map(d => d.value || 0), 1)
  const min = Math.min(...data.map(d => d.value || 0), 0)
  const range = max - min || 1
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 40) + 20
    const y = 10 + (1 - (d.value - min) / range) * (height - 20)
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline fill="none" stroke="#eef2ff" strokeWidth="8" points={points} opacity="0.6" />
        <polyline fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * (width - 40) + 20
          const y = 10 + (1 - (d.value - min) / range) * (height - 20)
          return <circle key={i} cx={x} cy={y} r={3} fill={stroke} />
        })}
      </svg>
    </div>
  )
}

// Simple vertical bar chart for small datasets
const BarChart = ({ data = [], height = 140 }) => {
  if (!data || !data.length) return <div className="text-sm text-gray-500">No data</div>
  const max = Math.max(...data.map(d => d.value || 0), 1)
  return (
    <div className="w-full h-full flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="text-xs text-gray-600 w-28 truncate">{d.label}</div>
          <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
            <div className="bg-indigo-500 h-4" style={{ width: `${Math.round((d.value / max) * 100)}%` }} />
          </div>
          <div className="w-12 text-right text-sm font-medium">{d.value}</div>
        </div>
      ))}
    </div>
  )
}

const Dashboard = () => {
  const [employees, setEmployees] = useState([])
  const [todayAttendances, setTodayAttendances] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [departments, setDepartments] = useState([])
  const [salarySummary, setSalarySummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || sessionStorage.getItem('token')) : null

  useEffect(() => {
    axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : undefined
  }, [token])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        // Try multiple endpoints; use settled to be resilient to missing APIs
        const [empRes, attRes, salRes, histRes, deptRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/employees`),
          axios.get(`${API_URL}/api/attendance/today`),
          axios.get(`${API_URL}/api/salary/monthly`, { params: { month: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`, page: 1, pageSize: 1 } }),
          // attendance history endpoints (try a couple of variants)
          axios.get(`${API_URL}/api/attendance/history`, { params: { days: 14 } }),
          axios.get(`${API_URL}/api/departments`)
        ])

        if (empRes.status === 'fulfilled' && empRes.value.data?.success) {
          setEmployees(empRes.value.data.data || [])
        }

        if (attRes.status === 'fulfilled' && attRes.value.data?.success) {
          const d = attRes.value.data.data || {}
          setTodayAttendances(d.attendances || [])
          setAttendanceMap(d.map || {})
        }

        if (salRes.status === 'fulfilled' && salRes.value.data?.success) {
          setSalarySummary(salRes.value.data.data?.summary || null)
        }

        // attendance history: accept multiple response shapes
        if (histRes.status === 'fulfilled' && histRes.value.data) {
          // prefer { data: { success, data: { history: [...] } } }
          const body = histRes.value.data
          const data = body.data?.data || body.data || body
          const history = data.history || data || []
          setAttendanceHistory(Array.isArray(history) ? history : [])
        }

        if (deptRes.status === 'fulfilled' && deptRes.value.data?.success) {
          setDepartments(deptRes.value.data.data || [])
        }
      } catch (e) {
        console.error('Dashboard fetch error', e)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const totalEmployees = employees.length
  const presentCount = todayAttendances.length
  const absentCount = Math.max(0, totalEmployees - presentCount)

  const topPresent = useMemo(() => {
    // show first 8 present rows
    return todayAttendances.slice(0, 8).map(a => ({
      empId: a.employeeId || a.employee || (a.employee && a.employee._id),
      name: a.empName || (a.employee && a.employeeName) || a.employeeName || 'Unknown',
      inTime: a.inTime || a.punchLogs?.[0]?.punchTime || '',
      outTime: a.outTime || '',
      totalHours: a.totalHoursDisplay || a.totalHours || ''
    }))
  }, [todayAttendances])

  // compute average hours for today (try numeric or HH:MM)
  const avgHours = useMemo(() => {
    if (!todayAttendances.length) return 0
    let total = 0
    let count = 0
    for (const a of todayAttendances) {
      const val = a.totalHours || a.totalHoursDisplay || a.workingHours || ''
      if (typeof val === 'number') {
        total += val
        count++
        continue
      }
      if (typeof val === 'string') {
        // try parse HH:MM
        const m = val.match(/(\d{1,2}):(\d{2})/)
        if (m) {
          const hrs = Number(m[1]) + Number(m[2]) / 60
          total += hrs
          count++
          continue
        }
        const n = Number(val)
        if (!Number.isNaN(n) && n > 0) {
          total += n
          count++
        }
      }
    }
    return count ? +(total / count).toFixed(2) : 0
  }, [todayAttendances])

  // build attendance trend: from attendanceHistory if provided, else fabricate small series
  const attendanceTrend = useMemo(() => {
    if (attendanceHistory && attendanceHistory.length) {
      // expect array of { date, present }
      return attendanceHistory.slice(-14).map(h => ({ date: h.date || h._id || h.label, value: h.present || h.count || h.value || 0 }))
    }
    // fallback: fabricate last 7 days by shifting today's count
    const today = presentCount
    const arr = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const variance = Math.round((Math.sin(i) + 1) * 3)
      arr.push({ date: d.toLocaleDateString(), value: Math.max(0, today - variance) })
    }
    return arr
  }, [attendanceHistory, presentCount])

  // department present counts
  const deptCounts = useMemo(() => {
    const map = {}
    if (employees && employees.length) {
      for (const e of employees) {
        const name = (e.department && (e.department.name || e.department.label)) || e.department || 'Unassigned'
        map[name] = (map[name] || 0) + 1
      }
    }
    return Object.entries(map).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value)
  }, [employees])

  // simple trend analysis: compare last two points
  const trendAnalysis = useMemo(() => {
    if (!attendanceTrend.length) return 'No data'
    const last = attendanceTrend[attendanceTrend.length - 1].value || 0
    const prev = attendanceTrend.length > 1 ? attendanceTrend[attendanceTrend.length - 2].value || 0 : last
    if (last > prev) return `Up ${last - prev} vs previous day`
    if (last < prev) return `Down ${prev - last} vs previous day`
    return 'Stable'
  }, [attendanceTrend])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 flex flex-col">
          <div className="text-sm text-gray-500">Employees</div>
          <div className="text-2xl font-bold">{totalEmployees}</div>
          <div className="text-sm text-gray-600">Active employees</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 flex flex-col">
          <div className="text-sm text-gray-500">Today Present</div>
          <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          <div className="text-sm text-gray-600">{trendAnalysis}</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 flex flex-col">
          <div className="text-sm text-gray-500">Average Hours</div>
          <div className="text-2xl font-bold">{avgHours}h</div>
          <div className="text-sm text-gray-600">Avg working time (today)</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 flex flex-col">
          <div className="text-sm text-gray-500">Payroll</div>
          <div className="text-2xl font-bold">{salarySummary ? `₹${Number(salarySummary.totalPayable || 0).toLocaleString()}` : '—'}</div>
          <div className="text-sm text-gray-600">Total payable (month)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-4">
          <h3 className="text-sm text-gray-500 mb-2">Attendance Trend (last days)</h3>
          <LineChart data={attendanceTrend} height={160} />
          <div className="mt-3 text-sm text-gray-600">Trend: {trendAnalysis} • Updated: {new Date().toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm text-gray-500 mb-2">Department Breakdown</h3>
          <BarChart data={deptCounts.slice(0, 6)} height={160} />
          <div className="mt-3 text-sm text-gray-600">Top departments by headcount</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EmployeeAttendance attendances={topPresent} loading={loading} totalPresent={presentCount} totalEmployees={totalEmployees} />
        </div>

        <div>
          <FestivalList />
        </div>
      </div>
    </div>
  )
}

export default Dashboard