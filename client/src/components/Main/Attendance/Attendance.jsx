import React, { useEffect, useState, useRef } from "react"
import axios from "axios"
import AttendanceFilter from "./components/AttendanceFilter"
import EmployeeSummary from "./components/EmployeeSummary"
import AttendanceTable from "./components/AttendanceTable"
import EmployeeTable from "../commonComponents/employeeTable"
import BarcodeScanner from "./components/BarcodeScanner"
import PunchRecordsModal from "./components/PunchRecordsModal"
import MonthlySummaryCard from "./components/MonthlySummaryCard"
import ManualAttendanceModal from "./components/ManualAttendanceModal"
import { toast } from "react-toastify"
import { MdOutlineQrCodeScanner, MdKeyboardBackspace } from "react-icons/md"
import { FaUserCheck } from "react-icons/fa"
import { IoMdLogOut, IoMdAddCircle } from "react-icons/io"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100"
const API = `${API_URL}/api/attendance-report`

const Attendance = () => {
  // Use local date (YYYY-MM-DD) so frontend matches server's attendance day logic
  const todayIso = new Date().toLocaleDateString('en-CA')

  const [filters, setFilters] = useState({
    search: "",
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
    year: String(new Date().getFullYear()),
  })

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [empsLoading, setEmpsLoading] = useState(false)
  const [viewMode, setViewMode] = useState("list")
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [punchModalOpen, setPunchModalOpen] = useState(false)
  const [selectedPunchDate, setSelectedPunchDate] = useState(null)
  const [isProcessingPunch, setIsProcessingPunch] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [holidays, setHolidays] = useState([])
  const fetchInProgressRef = useRef(false)
  const lastRequestedRef = useRef(null)
  const loadEmployeesRef = useRef(null)
  const loadHolidaysRef = useRef(null)

  /* ---------------- Resize ---------------- */
  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  /* ---------------- Load Employees & Holidays ---------------- */
  useEffect(() => {
    // Extract loaders so they can be reused after barcode/punch actions
    const loadEmployees = async () => {
      try {
        setEmpsLoading(true)
        const [resEmps, resAtt] = await Promise.all([
          axios.get(`${API_URL}/api/employees`),
          axios.get(`${API_URL}/api/attendance/today`)
        ])

        const list = resEmps.data?.data || []
        const attMap = resAtt.data?.data?.map ? resAtt.data.data.map : {}

        const enriched = list.map(emp => {
          const key = emp._id
          const todayRec = attMap && attMap[key] ? attMap[key] : null
          return {
            ...emp,
            attendanceMarked: !!todayRec,
            attendanceStatus: todayRec ? todayRec.status || 'present' : null,
          }
        })

        setEmployees(enriched)
      } catch (err) {
        console.error('Failed to load employees', err)
      } finally {
        setEmpsLoading(false)
      }
    }

    const loadHolidays = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/holidays`)
        setHolidays(res.data?.data || [])
      } catch (err) {
        console.error('Failed to load holidays', err)
      }
    }

    // initial load
    loadEmployees()
    loadHolidays()

    // expose loaders to refs for later use
    loadEmployeesRef.current = loadEmployees
    loadHolidaysRef.current = loadHolidays
  }, [])

  /* ---------------- Fetch Report ---------------- */
  const fetchReport = async params => {
    // Prevent duplicate or overlapping fetches for the same employee/month/year
    if (fetchInProgressRef.current) return
    const requestedKey = `${params.employeeId || ''}_${params.month || ''}_${params.year || ''}`
    if (lastRequestedRef.current === requestedKey && report && report.employee && report.employee._id === params.employeeId) {
      // already showing this report
      return
    }

    try {
      fetchInProgressRef.current = true
      setLoading(true)
      lastRequestedRef.current = requestedKey
      const res = await axios.get(API, { params })
      setReport(res.data?.data || null)
      setViewMode("report")
    } catch (err) {
      console.error('fetchReport error', err)
      toast.error("Failed to load report")
    } finally {
      fetchInProgressRef.current = false
      setLoading(false)
    }
  }

  /* ---------------- Auto Refresh Report ---------------- */
  const refreshReport = () => {
    if (report?.employee?._id) {
      fetchReport({
        employeeId: report.employee._id,
        month: filters.month,
        year: filters.year,
      })
    }
  }

  /* ---------------- Punch State ---------------- */
  const getTodayPunchState = emp => {
    const todayAttendance = emp?.attendance?.find(a =>
      a.date?.startsWith(todayIso)
    )

    if (!todayAttendance || !todayAttendance.punchLogs?.length) {
      return "NOT_MARKED"
    }

    const lastPunch =
      todayAttendance.punchLogs.at(-1)?.punchType?.toUpperCase()

    return lastPunch === "IN" ? "IN" : "OUT"
  }

  /* ---------------- Unified Punch Handler ---------------- */
  const handlePunch = async emp => {
    if (isProcessingPunch) return

    try {
      setIsProcessingPunch(true)

      const res = await axios.post(
        `${API_URL}/api/employees/${emp._id}/attendance`,
        {}
      )

      if (res.data?.type === "in") {
        toast.success(`Punch IN successful for ${emp.name}`)
      } else if (res.data?.type === "out") {
        toast.success(
          `Punch OUT successful for ${emp.name} (${res.data.total_hours || 0}h)`
        )
      }

      // Update employee list using response type
      const punchType = res.data?.type
      setEmployees(prev =>
        prev.map(e =>
          e._id === emp._id
            ? {
              ...e,
              attendanceMarked: true,
              attendanceStatus: punchType === 'in' ? 'present' : 'out',
            }
            : e
        )
      )

      // Refresh employees list so badges/counts update across UI
      try { loadEmployeesRef.current && await loadEmployeesRef.current() } catch (e) { }

      // If the currently viewed report belongs to this employee, force refresh it
      if (report?.employee?._id === emp._id) {
        // clear lastRequestedRef so fetchReport will actually refetch updated data
        lastRequestedRef.current = null
        await fetchReport({
          employeeId: emp._id,
          month: filters.month,
          year: filters.year,
        })
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Punch failed")
    } finally {
      setIsProcessingPunch(false)
    }
  }

  /* ---------------- Manual Past Attendance ---------------- */
  const handleManualAttendanceSubmit = async ({ employeeId, date, inTime, outTime }) => {
    try {
      setIsProcessingPunch(true)

      const res = await axios.post(
        `${API_URL}/api/employees/${employeeId}/attendance`,
        {
          date,
          inTime,
          outTime,
        }
      )

      toast.success(res.data?.message || 'Attendance marked successfully')

      // Refresh employees list so badges/counts update across UI
      try { await loadEmployeesRef.current?.() } catch (e) { }

      // If currently viewing this employee's report, refresh it
      if (report?.employee?._id === employeeId) {
        lastRequestedRef.current = null
        await fetchReport({
          employeeId,
          month: filters.month,
          year: filters.year,
        })
      }

      setManualModalOpen(false)
    } catch (err) {
      console.error('Manual attendance error', err)
      toast.error(err?.response?.data?.message || 'Failed to mark attendance')
    } finally {
      setIsProcessingPunch(false)
    }
  }

  /* ---------------- Cell Click ---------------- */
  const handleCellClick = (isoDate, rowType) => {
    const attendance = report?.employee?.attendance?.find(a =>
      a.date?.startsWith(isoDate)
    )
    if (attendance) {
      setSelectedPunchDate({ date: isoDate, attendance, rowType })
      setPunchModalOpen(true)
    }
  }

  /* ================= RENDER ================= */
  return (
    <div className="w-full min-h-screen flex flex-col">

      {/* Back Button */}
      {!isMobile && viewMode === "report" && (
        <div className="p-6 pb-0">
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2 text-gray-600 hover:text-black cursor-pointer"
          >
            <MdKeyboardBackspace size={24} />
            <span>Back to List</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 mx-6 mt-6 rounded-t-xl bg-gray-900 text-white flex justify-between items-center">
        <h1 className="font-semibold">
          {viewMode === "report"
            ? `Attendance - ${report?.employee?.name}`
            : "Mark Attendance"}
        </h1>

        {viewMode === "report" ? (() => {
          const emp = report.employee
          const punchState = getTodayPunchState(emp)

          if (punchState === "NOT_MARKED") {
            return (
              <button
                title="Mark Attendance"
                disabled={isProcessingPunch}
                onClick={() => handlePunch(emp)}
                className="bg-gray-700 p-2 rounded-full hover:bg-green-600 cursor-pointer"
              >
                <FaUserCheck size={24} />
              </button>
            )
          }

          if (punchState === "IN") {
            return (
              <button
                title="Punch Out"
                disabled={isProcessingPunch}
                onClick={() => handlePunch(emp)}
                className="bg-red-600 p-2 rounded-full hover:bg-red-700 cursor-pointer"
              >
                <IoMdLogOut size={24} />
              </button>
            )
          }

          return (
            <button
              title="Punch In"
              disabled={isProcessingPunch}
              onClick={() => handlePunch(emp)}
              className="bg-green-600 p-2 rounded-full hover:bg-green-700 cursor-pointer"
            >
              <IoMdLogOut size={24} className="rotate-180" />
            </button>
          )
        })() : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScannerOpen(true)}
              title="Open Scanner"
              className="p-2 rounded-full bg-white text-gray-800 hover:bg-gray-100 cursor-pointer"
            >
              <MdOutlineQrCodeScanner size={24} />
            </button>
            <button
              onClick={() => setManualModalOpen(true)}
              title="Add Past Attendance"
              className="flex items-center gap-1 text-center text-lg px-3 py-2 rounded-full bg-white text-gray-800 font-medium hover:bg-gray-100 cursor-pointer"
            >
              <IoMdAddCircle size={30} className="inline mr-1" />
              Add Attendance
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-6 flex-1 px-4 sm:px-6">
        {viewMode === "list" ? (
          <EmployeeTable
            employees={employees}
            loading={empsLoading}
            rowsPerPage={isMobile ? 4 : 6}
            onNameClick={emp =>
              fetchReport({
                employeeId: emp._id,
                month: filters.month,
                year: filters.year,
              })
            }
            renderActions={emp =>
              emp.attendanceMarked ? (
                <button
                  disabled
                  title="Attendance Marked"
                  className="ml-6 text-green-600 px-3 py-1 rounded-full"
                >
                  <FaUserCheck size={20} />
                </button>
              ) : (
                <button
                  title="Mark Attendance"
                  onClick={e => {
                    e.stopPropagation()
                    handlePunch(emp)
                  }}
                  className="ml-6 bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 cursor-pointer"
                >
                  <FaUserCheck size={14} />
                </button>
              )
            }
          />
        ) : (
          <>
            {loading &&
              <div className="flex justify-center items-center p-10">
                <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
              </div>
            }
            {!loading && report && (
              <>
                <EmployeeSummary emp={report.employee} isMobile={isMobile} />

                <AttendanceFilter
                  filters={filters}
                  setFilters={setFilters}
                  onSearch={() => fetchReport(filters)}
                  reportData={report}
                  isMobile={isMobile}
                />

                <MonthlySummaryCard summary={report.summary} isMobile={isMobile} />

                <AttendanceTable
                  days={report.days}
                  data={report.table}
                  isMobile={isMobile}
                  attendanceRaw={report.employee.attendance}
                  onCellClick={handleCellClick}
                  holidays={holidays}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Scanner */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
          onAttendanceMarked={async () => {
            // scanner marked attendance on server — refresh employees and report
            try { await loadEmployeesRef.current?.() } catch (e) { }
            lastRequestedRef.current = null
            refreshReport()
            setScannerOpen(false)
          }}
      />

      {/* Punch Records Modal */}
      {selectedPunchDate && (
        <PunchRecordsModal
          isOpen={punchModalOpen}
          onClose={() => {
            setPunchModalOpen(false)
            setSelectedPunchDate(null)
          }}
          attendance={selectedPunchDate.attendance}
          date={selectedPunchDate.date}
          employeeName={report?.employee?.name}
          shiftHours={report?.employee?.shift || 8}
        />
      )}

      {/* Manual Attendance Modal */}
      <ManualAttendanceModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        employees={employees}
        onSubmit={handleManualAttendanceSubmit}
      />
    </div>
  )
}

export default Attendance
