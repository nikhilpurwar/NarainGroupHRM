import React, { useEffect, useState } from "react"
import axios from "axios"
import AttendanceFilter from "./components/AttendanceFilter"
import EmployeeSummary from "./components/EmployeeSummary"
import AttendanceTable from "./components/AttendanceTable"
import EmployeeTable from "../commonComponents/EmployeeTable"
import { toast } from "react-toastify"
import { MdOutlineQrCodeScanner } from "react-icons/md";
import { FaUserCheck } from "react-icons/fa";
import { MdKeyboardBackspace } from "react-icons/md"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
const API = `${API_URL}/api/attendance-report`

const Attendance = () => {
  const now = new Date()
  const currentMonth = String(now.getMonth() + 1)
  const currentYear = String(now.getFullYear())

  const [filters, setFilters] = useState({
    search: "",
    month: currentMonth,
    year: currentYear,
  })

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [empsLoading, setEmpsLoading] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'report'

  // Load employees list on mount
  useEffect(() => {
    // load employees list for quick marking
    const loadEmps = async () => {
      try {
        setEmpsLoading(true)
        const res = await axios.get(`${API_URL}/api/employees`)
        const todayIso = new Date().toISOString().slice(0, 10)
        const enriched = (res.data?.data || []).map(emp => {
          const rec = (emp.attendance || []).find(a => a.date === todayIso || (a.date && a.date.startsWith && a.date.startsWith(todayIso)))
          return { ...emp, attendanceMarked: !!rec, attendanceStatus: rec?.status || null }
        })
        setEmployees(enriched)
      } catch (err) {
        console.error('Failed to load employees', err)
      } finally {
        setEmpsLoading(false)
      }
    }
    loadEmps()
  }, [])

  const fetchReport = async (params) => {
    try {
      setLoading(true)
      const res = await axios.get(API, { params })
      // Handle response structure: { success, data: { employee, days, table } }
      if (res.data?.data) {
        setReport(res.data.data)
        setViewMode('report') // Switch to report view
      } else {
        setReport(null)
      }
    } catch (err) {
      console.error('Failed to load report', err)
      toast.error("Failed to load report")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToList = () => {
    setViewMode('list')
    setReport(null)
  }

  const handleSearch = () => {
    fetchReport(filters)
  }

  const markAttendance = async (emp) => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      await axios.post(`${API_URL}/api/employees/${emp._id}/attendance`, { date: today, status: 'present' })
      toast.success(`Marked attendance for ${emp.name}`)
      // if currently viewing this employee report, refresh
      if (report?.employee && (report.employee._id === emp._id || report.employee === emp._id)) {
        fetchReport({ employeeId: emp._id, month: filters.month, year: filters.year })
      }
      // update local list to reflect marked status
      setEmployees(prev => prev.map(e => (e._id === emp._id ? { ...e, attendanceMarked: true, attendanceStatus: 'present' } : e)))
    } catch (err) {
      console.error('Mark failed', err)
      toast.error('Failed to mark attendance')
    }
  }

  return (
    <div className="w-full flex flex-col">

      {/* Back Button */}
      {viewMode === "report" && (
        <div className="p-6 pb-0">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-gray-600 hover:text-black"
          >
            <MdKeyboardBackspace size={26} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-6">
        <div className="flex justify-between items-center py-4 px-6 text-white bg-gray-900 rounded-t-xl font-semibold text-xl">
          {viewMode === "report"
            ? `Attendance Report - ${report?.employee?.name}`
            : "Mark/See Attendance"}

          <button className="bg-gray-700 p-2 rounded-full hover:bg-gray-400">
            <MdOutlineQrCodeScanner size={28} />
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="p-6 pt-0">
        {viewMode === "list" ? (
          <EmployeeTable
            employees={employees}
            rowsPerPage={6}
            loading={empsLoading}
            onNameClick={(emp) =>
              fetchReport({
                employeeId: emp._id,
                month: filters.month,
                year: filters.year,
              })
            }
            renderActions={(emp) =>
              emp.attendanceMarked ? (
                <button className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full" disabled>
                  Marked
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    markAttendance(emp)
                  }}
                  className="flex items-center gap-2 bg-gray-600 text-white px-3 py-1 rounded-full"
                >
                  <FaUserCheck /> Mark
                </button>
              )
            }
          />
        ) : (
          <div className="max-w-[1520px] flex flex-col">
            {loading && <div className="text-center py-10">Loading...</div>}

            {!loading && report && (
              <div className="mt-6 w-full">
                <EmployeeSummary emp={report.employee} />

                <AttendanceFilter
                  filters={filters}
                  setFilters={setFilters}
                  onSearch={handleSearch}
                  reportData={report}
                />

                <AttendanceTable days={report.days} data={report.table} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>

  )
}

export default Attendance