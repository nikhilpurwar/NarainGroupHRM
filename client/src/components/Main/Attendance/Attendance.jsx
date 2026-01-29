import React, { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import AttendanceFilter from "./components/AttendanceFilter"
import EmployeeSummary from "./components/EmployeeSummary"
import AttendanceTable from "./components/AttendanceTable"
import EmployeeTable from "../commonComponents/employeeTable"
import PunchRecordsModal from "./components/PunchRecordsModal"
import MonthlySummaryCard from "./components/MonthlySummaryCard"
import ManualAttendanceModal from "./components/ManualAttendanceModal"
import { toast } from "react-toastify"
import { useDispatch, useSelector } from 'react-redux'
import { ensureEmployees } from '../../../store/employeesSlice'
import { ensureTodayAttendance, updateAttendanceEntry, fetchTodayAttendance } from '../../../store/attendanceSlice'
import { MdOutlineQrCodeScanner, MdKeyboardBackspace } from "react-icons/md"
import { FaUserCheck } from "react-icons/fa"
import { IoMdLogOut, IoMdAddCircle } from "react-icons/io"
import { io as clientIO } from "socket.io-client"

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
  const [empsLoading, setEmpsLoading] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
  const employees = useSelector(s => s.employees.data || [])
  const attendanceMap = useSelector(s => s.attendance.map || {})
  const [viewMode, setViewMode] = useState("list")
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [punchModalOpen, setPunchModalOpen] = useState(false)
  const [selectedPunchDate, setSelectedPunchDate] = useState(null)
  const [isProcessingPunch, setIsProcessingPunch] = useState(false)
  const [optimisticMarked, setOptimisticMarked] = useState(new Set())
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [holidays, setHolidays] = useState([])
  const fetchInProgressRef = useRef(false)
  const lastRequestedRef = useRef(null)
  const loadEmployeesRef = useRef(null)
  const loadHolidaysRef = useRef(null)
  useEffect(() => {
    // Ensure cached employees and today's attendance are available
    const loadEmployees = async () => {
      try {
        setEmpsLoading(true)
        await dispatch(ensureEmployees())
      } catch (e) {
        console.error('ensureEmployees failed', e)
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

    // initial load (wrapped to allow awaiting dispatch)
    const init = async () => {
      await loadEmployees()
      try { await dispatch(ensureTodayAttendance()) } catch (e) {}
      await loadHolidays()
    }

    init()

    // expose loaders to refs for later use
    loadEmployeesRef.current = loadEmployees
    loadHolidaysRef.current = loadHolidays
  }, [dispatch])

  /* ---------------- Socket.IO Real-time Updates ---------------- */
  useEffect(() => {
    const socket = clientIO(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on("connect", () => {
      console.log("✓ Attendance Socket.IO connected");
    });

    socket.on("connect_error", (err) => {
      console.error("Attendance Socket.IO connection error:", err);
    });

    socket.on("attendance:updated", (payload) => {
      if (!payload || !payload.employee) return;

      // Update the attendance map immediately
      dispatch(updateAttendanceEntry({ employeeId: payload.employee, attendance: payload.attendance }));

      // If we have a report loaded and it belongs to the updated employee, refresh the report
      if (report?.employee?._id === payload.employee) {
        // Small delay to ensure backend has processed the monthly summary update
        setTimeout(() => {
          refreshReport();
        }, 500);
      }

      // Refresh today's attendance data for live updates
      try { dispatch(ensureTodayAttendance()) } catch (e) {}
    });

    socket.on("disconnect", () => {
      console.log("Attendance Socket.IO disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [API_URL, dispatch, report?.employee?._id]);

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
      setHolidays(res.data?.data?.holidays || [])
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

  /* ---------------- Punch Out All Employees ---------------- */
  const handlePunchOutAll = async () => {
    const inEmployees = employees.filter(emp => {
      if (emp.status !== 'active') return false
      const todayAtt = attendanceMap[emp._id] || attendanceMap[emp._id?.toString()]
      const punchLogs = todayAtt?.punchLogs || []
      return punchLogs.length > 0 && punchLogs[punchLogs.length - 1]?.punchType?.toUpperCase() === 'IN'
    })

    if (inEmployees.length === 0) {
      toast.info('No employees to punch out')
      return
    }

    try {
      setIsProcessingPunch(true)
      const results = await Promise.all(inEmployees.map(emp =>
        axios.post(`${API_URL}/api/employees/${emp._id}/attendance`, {
          clientTs: Date.now(),
          tzOffsetMinutes: new Date().getTimezoneOffset()
        })
      ))
      
      results.forEach((res, idx) => {
        const emp = inEmployees[idx]
        const returnedAtt = res.data?.attendance
        if (returnedAtt) {
          dispatch(updateAttendanceEntry({ employeeId: emp._id, attendance: returnedAtt }))
        }
      })
      
      toast.success(`Punched out ${inEmployees.length} employee(s)`)
      try { await dispatch(ensureEmployees()) } catch (e) {}
      try { await dispatch(ensureTodayAttendance()) } catch (e) {}
    } catch (err) {
      toast.error('Failed to punch out all employees')
    } finally {
      setIsProcessingPunch(false)
    }
  }

  /* ---------------- Unified Punch Handler ---------------- */
  const handlePunch = async emp => {
    if (isProcessingPunch) return

    if (emp.status !== 'active') {
      toast.error('Employee is inactive')
      return
    }

    // optimistic UI: mark as attended immediately
    setOptimisticMarked(prev => {
      const s = new Set(prev)
      s.add(emp._id)
      return s
    })

    try {
      setIsProcessingPunch(true)

      const res = await axios.post(
        `${API_URL}/api/employees/${emp._id}/attendance`,
        {
          clientTs: Date.now(),
          tzOffsetMinutes: new Date().getTimezoneOffset()
        }
      )

      if (res.data?.type === "in") {
        toast.success(`Punch IN successful for ${emp.name}`)
      } else if (res.data?.type === "out") {
        toast.success(
          `Punch OUT successful for ${emp.name} (${res.data.total_hours || 0}h)`
        )
      }

      // Update the attendance map immediately with the returned attendance
      const returnedAtt = res.data?.attendance
      if (returnedAtt) {
        dispatch(updateAttendanceEntry({ employeeId: emp._id, attendance: returnedAtt }))
      }

      // Update employee list using response type
      const punchType = res.data?.type
      // Refresh cached employees and today's attendance so UI updates instantly
      try { await dispatch(ensureEmployees()) } catch (e) {}
      try { await dispatch(ensureTodayAttendance()) } catch (e) {}

      // Refresh employees list so badges/counts update across UI
      try { loadEmployeesRef.current && await loadEmployeesRef.current() } catch (e) { }

      // clear optimistic mark after successful server refresh
      setOptimisticMarked(prev => {
        const s = new Set(prev)
        s.delete(emp._id)
        return s
      })

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
          clientTs: Date.now(),
          tzOffsetMinutes: new Date().getTimezoneOffset()
        }
      )

      toast.success(res.data?.message || 'Attendance marked successfully')


      // Refresh employees and today's attendance so UI updates instantly
      try { await dispatch(ensureEmployees()) } catch (e) { }
      try { await dispatch(ensureTodayAttendance()) } catch (e) { }
      try { await loadEmployeesRef.current?.() } catch (e) { }

      // Force report refetch (clearing lastRequestedRef) so computed OT/fields are retrieved
      lastRequestedRef.current = null

      // Merge returned attendance record into current report to show OT immediately
      const returnedAtt = res.data?.data?.attendanceRecord || res.data?.attendance || res.data?.data?.attendance
      // update Redux attendance map so table components use server values
      if (returnedAtt) {
        try {
          // prefer employee id from returned attendance if present
          const empKey = returnedAtt.employee && (returnedAtt.employee._id || returnedAtt.employee) ? String(returnedAtt.employee._id || returnedAtt.employee) : String(employeeId)
          dispatch(updateAttendanceEntry({ employeeId: empKey, attendance: returnedAtt }))
        } catch (e) {}
      }

      // force refresh today's attendance cache to ensure map is populated
      try { await dispatch(fetchTodayAttendance()) } catch (e) {}
      if (report?.employee?._id === employeeId && returnedAtt) {
        try {
          const attDateIso = returnedAtt.date
            ? (typeof returnedAtt.date === 'string' ? returnedAtt.date.slice(0, 10) : new Date(returnedAtt.date).toISOString().slice(0, 10))
            : null

          const newReport = JSON.parse(JSON.stringify(report))
          // ensure employee.attendance exists
          newReport.employee = newReport.employee || {}
          newReport.employee.attendance = Array.isArray(newReport.employee.attendance) ? newReport.employee.attendance : []

          if (attDateIso) {
            // replace existing attendance for that date or append
            const idx = newReport.employee.attendance.findIndex(a => a.date && String(a.date).startsWith(attDateIso))
            if (idx >= 0) {
              newReport.employee.attendance[idx] = returnedAtt
            } else {
              newReport.employee.attendance.push(returnedAtt)
            }

            // update table rows for that date if days exist
            const dayIndex = (newReport.days || []).findIndex(d => d.iso === attDateIso)
            if (dayIndex >= 0 && newReport.table) {
              const tbl = newReport.table
              // defensive init
              const ensureRow = (key) => { if (!Array.isArray(tbl[key])) tbl[key] = (new Array(newReport.days.length)).fill(null) }
              ensureRow('Status'); ensureRow('In'); ensureRow('Out'); ensureRow('Worked Hours'); ensureRow('Regular Hours'); ensureRow('OT (Hours)'); ensureRow('Note')

              tbl['Status'][dayIndex] = returnedAtt.status || 'present'
              tbl['In'][dayIndex] = returnedAtt.inTime || ''
              tbl['Out'][dayIndex] = returnedAtt.outTime || ''
              tbl['Worked Hours'][dayIndex] = returnedAtt.totalHoursDisplay || (typeof returnedAtt.totalHours !== 'undefined' ? String(returnedAtt.totalHours) : '')
              tbl['Regular Hours'][dayIndex] = returnedAtt.regularHoursDisplay || (typeof returnedAtt.regularHours !== 'undefined' ? String(returnedAtt.regularHours) : '')
              tbl['OT (Hours)'][dayIndex] = returnedAtt.overtimeHoursDisplay || (typeof returnedAtt.overtimeHours !== 'undefined' ? String(returnedAtt.overtimeHours) : '')
              tbl['Note'][dayIndex] = returnedAtt.note || ''
            }

            // update local report state
            setReport(newReport)
          } else {
            // fallback: refetch full report
            await fetchReport({ employeeId, month: filters.month, year: filters.year })
          }
        } catch (e) {
          // if anything fails, fallback to refetch
          lastRequestedRef.current = null
          await fetchReport({ employeeId, month: filters.month, year: filters.year })
        }
      } else {
        // if report not open for this employee, ensure caches updated for other UI
        try { await fetchReport({ employeeId, month: filters.month, year: filters.year }) } catch (e) { }
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
  // Build displayEmployees by merging attendance map and optimistic marks so state persists after refresh
  const displayEmployees = employees.map(e => {
    const id = e._id || e.id
    // optimistic override
    if (optimisticMarked.has(id)) return { ...e, attendanceMarked: true, attendanceStatus: 'present' }
    // if attendance map has entry for today, mark accordingly
    const att = attendanceMap && (attendanceMap[id] || attendanceMap[id.toString()])
    if (att) {
      const status = att.status || (att.present ? 'present' : 'absent')
      return { ...e, attendanceMarked: status !== 'absent', attendanceStatus: status }
    }
    return e
  })
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
      <div className="px-6 py-4 mx-6 mt-6 rounded-t-xl sticky top-0 z-40 bg-gray-900 text-white flex justify-between items-center">
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
              onClick={() => setManualModalOpen(true)}
              title="Add Past Attendance"
              className="flex items-center gap-1 text-center text-lg p-0.5 rounded-full bg-white text-gray-800 font-medium hover:bg-gray-100 cursor-pointer"
            >
              <IoMdAddCircle size={43} className="hover:scale-150 transition duration-300" />
              {/* Add Attendance */}
            </button>

            <button
              onClick={handlePunchOutAll}
              disabled={isProcessingPunch}
              title="Punch Out All"
              className="flex items-center gap-2 text-center text-lg p-2 rounded-full bg-red-600 text-white font-medium hover:bg-red-700 cursor-pointer disabled:opacity-50"
            >
              {/* Punch Out All */}
              <IoMdLogOut size={30} className="hover:scale-130 transition duration-300"/>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-6 flex-1 px-4 sm:px-6">
        {viewMode === "list" ? (
          <EmployeeTable
            employees={displayEmployees}
            loading={empsLoading}
            rowsPerPage={isMobile ? 4 : 6}
            onNameClick={emp => navigate(`/attendence-report?employeeId=${emp._id}&month=${filters.month}&year=${filters.year}`)}
            onView={emp => navigate(`/employee/${emp._id}`)}
            renderActions={emp => {
              if (emp.status !== 'active') {
                return (
                  <button
                    disabled
                    title="Employee Inactive"
                    className="text-center text-gray-400 px-3 py-1 rounded-full"
                  >
                    <FaUserCheck size={22} />
                  </button>
                )
              }
              const todayAtt = attendanceMap[emp._id] || attendanceMap[emp._id?.toString()]
              if (!todayAtt) {
                return (
                  <button
                    title="Mark Attendance"
                    onClick={e => {
                      e.stopPropagation()
                      handlePunch(emp)
                    }}
                    className="text-center bg-green-600 text-white px-4 py-1 rounded-full hover:bg-green-700 transition duration-300 cursor-pointer"
                  >
                    <FaUserCheck size={18} />
                  </button>
                )
              }
              const punchLogs = todayAtt.punchLogs || []
              if (!punchLogs.length) {
                return (
                  <button
                    title="Mark Attendance"
                    onClick={e => {
                      e.stopPropagation()
                      handlePunch(emp)
                    }}
                    className="text-center bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 cursor-pointer"
                  >
                    <FaUserCheck size={14} />
                  </button>
                )
              }
              const lastPunch = punchLogs[punchLogs.length - 1]?.punchType?.toUpperCase()
              if (lastPunch === 'IN') {
                return (
                  <button
                    title="Punch Out"
                    onClick={e => {
                      e.stopPropagation()
                      handlePunch(emp)
                    }}
                    className="text-center bg-red-600 text-white px-4 py-1 rounded-full hover:bg-red-700 cursor-pointer"
                  >
                    <IoMdLogOut size={20} />
                  </button>
                )
              }
              return (
                <button
                  title="Punch In"
                  onClick={e => {
                    e.stopPropagation()
                    handlePunch(emp)
                  }}
                  className="text-center bg-green-600 text-white px-4 py-1 rounded-full hover:bg-green-700 hover:scale-110 transition duration-300 cursor-pointer"
                >
                  <IoMdLogOut size={20} className="rotate-180" />
                </button>
              )
            }}
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
                  onSearch={() => {
                    if (report?.employee?._id) {
                      fetchReport({
                        employeeId: report.employee._id,
                        month: filters.month,
                        year: filters.year,
                      })
                    }
                  }}
                  reportData={report}
                  isMobile={isMobile}
                />

                <MonthlySummaryCard
                  summary={report.summary}
                  days={report.days}
                  table={report.table}
                  holidays={holidays}
                  isMobile={isMobile}
                  employee={report.employee}
                />

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
