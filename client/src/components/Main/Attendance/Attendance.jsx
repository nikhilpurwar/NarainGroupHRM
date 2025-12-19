import React, { useEffect, useState } from "react"
import axios from "axios"
import AttendanceFilter from "./components/AttendanceFilter"
import EmployeeSummary from "./components/EmployeeSummary"
import AttendanceTable from "./components/AttendanceTable"
import EmployeeTable from "../commonComponents/employeeTable"
import BarcodeScanner from "./components/BarcodeScanner"
import PunchRecordsModal from "./components/PunchRecordsModal"
import { toast } from "react-toastify"
import { MdOutlineQrCodeScanner, MdKeyboardBackspace } from "react-icons/md"
import { FaUserCheck } from "react-icons/fa"
import { IoMdLogOut } from "react-icons/io";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100"
const API = `${API_URL}/api/attendance-report`

const Attendance = () => {
  const now = new Date()
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0")
  const currentYear = String(now.getFullYear())
  const todayIso = new Date().toISOString().slice(0, 10)

  const [filters, setFilters] = useState({
    search: "",
    month: currentMonth,
    year: currentYear,
  })

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [empsLoading, setEmpsLoading] = useState(false)
  const [viewMode, setViewMode] = useState("list") // list | report
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [punchModalOpen, setPunchModalOpen] = useState(false)
  const [selectedPunchDate, setSelectedPunchDate] = useState(null)

  /* ------------------ Resize Handler ------------------ */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  /* ------------------ Load Employees ------------------ */
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setEmpsLoading(true)
        const res = await axios.get(`${API_URL}/api/employees`)
        const todayIso = new Date().toISOString().slice(0, 10)

        const enriched = (res.data?.data || []).map(emp => {
          const rec = (emp.attendance || []).find(
            a => a.date === todayIso || a?.date?.startsWith?.(todayIso)
          )
          return {
            ...emp,
            attendanceMarked: !!rec,
            attendanceStatus: rec?.status || null,
          }
        })

        setEmployees(enriched)
      } catch (err) {
        console.error("Failed to load employees", err)
      } finally {
        setEmpsLoading(false)
      }
    }

    loadEmployees()
  }, [])

  /* ------------------ Fetch Report with enhanced table data ------------------ */
  const fetchReport = async params => {
    try {
      setLoading(true)
      const res = await axios.get(API, { params })

      if (res.data?.data) {
        const reportData = res.data.data
        
        // Build enhanced table with Worked Hours and OT rows
        // (In and Out are already provided by backend, but ensure they show "--" for empty cells)
        if (reportData.employee && reportData.days && reportData.table) {
          const enhancedTable = { ...reportData.table }
          
          // Ensure In and Out rows have "--" for empty strings
          if (enhancedTable.In) {
            enhancedTable.In = enhancedTable.In.map(v => (v === '' || v === null) ? null : v)
          }
          if (enhancedTable.Out) {
            enhancedTable.Out = enhancedTable.Out.map(v => (v === '' || v === null) ? null : v)
          }
          
          // Build Worked Hours and OT rows
          const workedHoursRow = []
          const otRow = []

          reportData.days.forEach((d, idx) => {
            const rec = (reportData.employee.attendance || []).find(a => {
              const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null
              return aDate === d.iso
            })
            
            if (rec && rec.inTime && rec.outTime) {
              // Only show worked hours if both in and out are recorded
              workedHoursRow.push(rec.totalHours ? `${rec.totalHours}h` : null)
              otRow.push(rec.overtimeHours && rec.overtimeHours > 0 ? `${rec.overtimeHours}h` : null)
            } else {
              workedHoursRow.push(null)
              otRow.push(null)
            }
          })

          enhancedTable['Worked Hours'] = workedHoursRow
          enhancedTable['OT (Hours)'] = otRow

          reportData.table = enhancedTable
        }

        setReport(reportData)
        setViewMode("report")
      } else {
        setReport(null)
      }
    } catch (err) {
      console.error("Failed to load report", err)
      toast.error("Failed to load report")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  /* ------------------ Mark Attendance (Punch IN) ------------------ */
  const markAttendance = async emp => {
    try {
      const today = new Date().toISOString().slice(0, 10)

      await axios.post(
        `${API_URL}/api/employees/${emp._id}/attendance`,
        { date: today, status: "present" }
      )

      toast.success(`Marked attendance for ${emp.name}`)

      // Update employee list
      setEmployees(prev =>
        prev.map(e =>
          e._id === emp._id
            ? { ...e, attendanceMarked: true, attendanceStatus: "present" }
            : e
        )
      )

      // Update report view if open
      setReport(prev => {
        if (!prev) return prev
        const todayIdx = prev.days.findIndex(d => d.iso === today)
        const updatedTable = prev.table ? { ...prev.table } : null
        if (updatedTable && typeof updatedTable.Status !== 'undefined' && todayIdx !== -1) {
          const statusArr = [...updatedTable.Status]
          statusArr[todayIdx] = 'present'
          updatedTable.Status = statusArr
        }
        return {
          ...prev,
          employee: {
            ...prev.employee,
            attendanceMarked: true,
            attendanceStatus: 'present'
          },
          table: updatedTable
        }
      })
    } catch (err) {
      console.error("Mark attendance failed", err)
      toast.error("Failed to mark attendance")
    }
  }

  /* ------------------ Punch OUT Logic (via barcode endpoint) ------------------ */
  const markPunchOut = async emp => {
    try {
      // Use the barcode scanner endpoint to handle punch OUT
      // Pass employee empId as the barcode code
      const res = await axios.post(
        `${API_URL}/api/store-emp-attend?code=${emp.empId}`,
        { date: new Date().toISOString().slice(0, 10) }
      )

      if (res.data?.type === 'out') {
        toast.success(`Punch OUT successful for ${emp.name}\nTotal Hours: ${res.data.total_hours}h`)
        
        // Refresh report to show updated punch data (don't mark absent)
        if (report) {
          fetchReport({
            employeeId: report.employee._id,
            month: filters.month,
            year: filters.year,
          })
        }
      } else {
        toast.info("Punch recorded")
      }
    } catch (err) {
      console.error("Punch OUT failed", err)
      const message = err?.response?.data?.message || "Failed to punch out"
      toast.error(message)
    }
  }

  const handleBackToList = () => {
    setViewMode("list")
    setReport(null)
  }

  const handleSearch = () => fetchReport(filters)

  /* Refresh report (used after punch OUT) */
  const refreshReport = () => {
    if (report?.employee?._id) {
      fetchReport({
        employeeId: report.employee._id,
        month: filters.month,
        year: filters.year,
      })
    }
  }

  /* Handle cell click to open punch records modal */
  const handleCellClick = (isoDate, rowType) => {
    if (report?.employee?.attendance) {
      const attendance = report.employee.attendance.find(a => {
        const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null
        return aDate === isoDate
      })
      if (attendance) {
        setSelectedPunchDate({ date: isoDate, attendance, rowType })
        setPunchModalOpen(true)
      }
    }
  }

  /* ===================== RENDER ===================== */
  return (
    <div className="w-full flex flex-col min-h-screen mb-6">
      {/* Mobile Header */}
      {isMobile && viewMode === "report" && (
        <div className="sticky top-0 z-50 bg-white border-b p-4 flex items-center gap-3">
          <button onClick={handleBackToList}>
            <MdKeyboardBackspace size={24} />
          </button>
          <h1 className="text-lg font-semibold truncate">
            {report?.employee?.name
              ? `${report.employee.name}'s Report`
              : "Attendance Report"}
          </h1>
        </div>
      )}

      {/* Desktop Back Button */}
      {!isMobile && viewMode === "report" && (
        <div className="p-6 pb-0">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-gray-600 hover:text-black"
          >
            <MdKeyboardBackspace size={24} />
            <span>Back to List</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex justify-between items-center py-4 px-6 text-white bg-gray-900 rounded-t-xl">
          <div className="text-lg font-semibold">
            {viewMode === "report"
              ? `Attendance Report - ${report?.employee?.name}`
              : "Mark / See Attendance"}
          </div>

          {viewMode === "report" ? (
            (() => {
              const emp = report?.employee
              const reportAttendanceMarked = emp
                ? !!(
                    (emp.attendance || []).find(
                      a => a.date === todayIso || a?.date?.startsWith?.(todayIso)
                    ) || emp.attendanceMarked
                  )
                : false

              return !reportAttendanceMarked ? (
                <button
                  title="Mark Attendance"
                  onClick={() => markAttendance(report.employee)}
                  className="bg-gray-700 p-2 rounded-full hover:bg-green-600 cursor-pointer"
                >
                  <FaUserCheck size={24} />
                </button>
              ) : (
                <button
                  title="Punch Out"
                  onClick={() => markPunchOut(report.employee)}
                  className="bg-red-600 p-2 rounded-full hover:bg-red-700 cursor-pointer"
                >
                  <IoMdLogOut size={24} />
                </button>
              )
            })()
          ) : (
            <button 
              onClick={() => setScannerOpen(true)}
              title="Scan Barcode"
              className="bg-gray-700 p-2 rounded-full hover:bg-indigo-600 cursor-pointer transition"
            >
              <MdOutlineQrCodeScanner size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="sm:px-6 flex-1">
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
                  className="bg-gray-200 text-green-600 px-5 py-1 rounded-full cursor-not-allowed"
                >
                  <FaUserCheck size={20} />
                </button>
              ) : (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    markAttendance(emp)
                  }}
                  className="flex items-center gap-2 mr-3 bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-800"
                >
                  <FaUserCheck size={14} /> Mark
                </button>
              )
            }
          />
        ) : (
          <>
            {loading && (
              <div className="text-center py-10">
                <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto" />
                <p className="mt-2">Loading report...</p>
              </div>
            )}

            {!loading && report && (
              <div className="space-y-6">
                <EmployeeSummary emp={report.employee} isMobile={isMobile} />

                <AttendanceFilter
                  filters={filters}
                  setFilters={setFilters}
                  onSearch={handleSearch}
                  reportData={report}
                  isMobile={isMobile}
                />

                <div className="max-w-[calc(100vw-10vw)] overflow-auto main-scroll">
                  <AttendanceTable
                    days={report.days}
                    data={report.table}
                    isMobile={isMobile}
                    attendanceRaw={report.employee.attendance}
                    onCellClick={handleCellClick}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner 
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onAttendanceMarked={(empData) => {
          // Refresh employees list to show updated attendance status
          const updatedEmployees = employees.map(emp => {
            if (emp._id === empData._id || emp.empId === empData.empId) {
              return {
                ...emp,
                attendanceMarked: true,
                attendanceStatus: 'present'
              }
            }
            return emp
          })
          setEmployees(updatedEmployees)
          
          // Close scanner after a brief delay
          setTimeout(() => {
            setScannerOpen(false)
          }, 2500)
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
          employeeName={report?.employee?.name || 'Employee'}
          shiftHours={report?.employee?.workHours || 8}
        />
      )}
    </div>
  )
}

export default Attendance
