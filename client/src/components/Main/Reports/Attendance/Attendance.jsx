import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import AttendanceFilter from "../../Attendance/components/AttendanceFilter";
import EmployeeSummary from "../../Attendance/components/EmployeeSummary";
import AttendanceTable from "../../Attendance/components/AttendanceTable";
import MonthlySummaryCard from "../../Attendance/components/MonthlySummaryCard";
import EmployeeTable from "../../commonComponents/employeeTable";
import ManualAttendanceModal from "../../Attendance/components/ManualAttendanceModal";
import PunchRecordsModal from "../../Attendance/components/PunchRecordsModal";
import { ensureEmployees } from "../../../../store/employeesSlice";
import { ensureTodayAttendance } from "../../../../store/attendanceSlice";
import { toast } from "react-toastify";
import { FaUserCheck } from "react-icons/fa";
import { IoMdLogOut } from "react-icons/io";
import Spinner from "../../../utility/Spinner";
import { MdKeyboardBackspace } from "react-icons/md";
import { IoChevronDown } from "react-icons/io5";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const API = `${API_URL}/api/attendance-report`;

const ReportsAttendance = () => {
  const [searchParams] = useSearchParams();
  const queryEmployeeId = searchParams.get("employeeId");
  const dispatch = useDispatch();
  const employees = useSelector((s) => s.employees.data);
  const attendanceMap = useSelector((s) => s.attendance.map || {});
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  });

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empsLoading, setEmpsLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [selectedPunchDate, setSelectedPunchDate] = useState(null);
  const [isProcessingPunch, setIsProcessingPunch] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const fetchInProgressRef = useRef(false);
  const lastRequestedRef = useRef(null);
  const loadEmployeesRef = useRef(null);
  const loadHolidaysRef = useRef(null);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null)

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setEmpsLoading(true);
        await dispatch(ensureEmployees());
      } catch (e) {
        console.error("ensureEmployees failed", e);
      } finally {
        setEmpsLoading(false);
      }
    };

    const loadHolidays = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/holidays`);
        setHolidays(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load holidays", err);
      }
    };

    const init = async () => {
      await loadEmployees();
      try {
        await dispatch(ensureTodayAttendance());
      } catch (e) {}
      await loadHolidays();
      // determine initial employee to show if none in query; if attendanceMap not ready, fall back to employees list
      if (!queryEmployeeId) {
        const keys = Object.keys(attendanceMap || {});
        if (keys.length) {
          fetchReport({
            employeeId: keys[0],
            month: filters.month,
            year: filters.year,
          });
          return;
        }
        if ((employees || []).length) {
          fetchReport({
            employeeId: employees[0]._id,
            month: filters.month,
            year: filters.year,
          });
        }
      }
    };

    init();
    loadEmployeesRef.current = loadEmployees;
    loadHolidaysRef.current = loadHolidays;
  }, [dispatch,  queryEmployeeId]);
 // attendanceMap, employees,

  useEffect(() => {
    if (queryEmployeeId) {
      fetchReport({
        employeeId: queryEmployeeId,
        month: filters.month,
        year: filters.year,
      });
    }
  }, [queryEmployeeId]);

  const fetchReport = async (params) => {
    if (fetchInProgressRef.current) return;
    const requestedKey = `${params.employeeId || ""}_${params.month || ""}_${params.year || ""}`;
    if (
      lastRequestedRef.current === requestedKey &&
      report &&
      report.employee &&
      report.employee._id === params.employeeId
    )
      return;

    try {
      fetchInProgressRef.current = true;
      setLoading(true);
      lastRequestedRef.current = requestedKey;
      const res = await axios.get(API, { params, timeout: 10000 });
      const data = res.data?.data || res.data || null;
      if (!data || !data.employee) {
        setReport(null);
        toast.info("No report data for selected employee");
      } else {
        setReport(data);
      }
    } catch (err) {
      console.error("fetchReport error", err);
      setReport(null);
      toast.error(err?.response?.data?.message || "Failed to load report");
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
      setInitializing(false); // 
    }
  };

  const refreshReport = () => {
    if (report?.employee?._id) {
      fetchReport({
        employeeId: report.employee._id,
        month: filters.month,
        year: filters.year,
      });
    }
  };

  const handlePunch = async (emp) => {
    if (isProcessingPunch) return;
    try {
      setIsProcessingPunch(true);
      const res = await axios.post(
        `${API_URL}/api/employees/${emp._id}/attendance`,
        {
          clientTs: Date.now(),
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        },
      );
      const punchType = res.data?.type;
      try {
        await dispatch(ensureEmployees());
      } catch (e) {}
      try {
        await dispatch(ensureTodayAttendance());
      } catch (e) {}
      try {
        loadEmployeesRef.current && (await loadEmployeesRef.current());
      } catch (e) {}
      if (report?.employee?._id === emp._id) {
        lastRequestedRef.current = null;
        await fetchReport({
          employeeId: emp._id,
          month: filters.month,
          year: filters.year,
        });
      }
      if (punchType === "in")
        toast.success(`Punch IN successful for ${emp.name}`);
      else if (punchType === "out")
        toast.success(
          `Punch OUT successful for ${emp.name} (${res.data.total_hours || 0}h)`,
        );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Punch failed");
    } finally {
      setIsProcessingPunch(false);
    }
  };

  const handleManualAttendanceSubmit = async ({
    employeeId,
    date,
    inTime,
    outTime,
  }) => {
    try {
      setIsProcessingPunch(true);
      const res = await axios.post(
        `${API_URL}/api/employees/${employeeId}/attendance`,
        {
          date,
          inTime,
          outTime,
          clientTs: Date.now(),
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        },
      );
      toast.success(res.data?.message || "Attendance marked successfully");
      try {
        await loadEmployeesRef.current?.();
      } catch (e) {}
      if (report?.employee?._id === employeeId) {
        lastRequestedRef.current = null;
        await fetchReport({
          employeeId,
          month: filters.month,
          year: filters.year,
        });
      }
      setManualModalOpen(false);
    } catch (err) {
      console.error("Manual attendance error", err);
      toast.error(err?.response?.data?.message || "Failed to mark attendance");
    } finally {
      setIsProcessingPunch(false);
    }
  };

  const handleCellClick = (isoDate, rowType) => {
    const attendance = report?.employee?.attendance?.find((a) =>
      a.date?.startsWith(isoDate),
    );
    if (attendance) {
      setSelectedPunchDate({ date: isoDate, attendance, rowType });
      setPunchModalOpen(true);
    }
  };

  const getTodayPunchState = (emp) => {
    if (!emp) return "NOT_MARKED";
    const todayIso = new Date().toLocaleDateString("en-CA");
    const todayAttendance = emp?.attendance?.find((a) =>
      a.date?.startsWith(todayIso),
    );
    if (!todayAttendance || !todayAttendance.punchLogs?.length)
      return "NOT_MARKED";
    const lastPunch = todayAttendance.punchLogs
      .at(-1)
      ?.punchType?.toUpperCase();
    return lastPunch === "IN" ? "IN" : "OUT";
  };

useEffect(() => {
  const onDocClick = (e) => {
    if (!searchWrapRef.current) return;

    if (!searchWrapRef.current.contains(e.target)) {
      setSearchFocused(false);
      setFilters((f) => ({ ...f, search: "" }));
    }
  };

  document.addEventListener("mousedown", onDocClick);
  return () => document.removeEventListener("mousedown", onDocClick);
}, []);



  // Search helpers
  const filteredEmployees = useMemo(() => {
    const q = (filters.search || "").toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.empId || "").toLowerCase().includes(q),
    );
  }, [employees, filters.search]);

  return (
   <div className="relative bg-white p-6 min-h-screen">
  {/* Back Button */}
  <button
    onClick={() => navigate(-1)}
    className="mb-4 group flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
  >
    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-gray-100 transition-colors">
      <MdKeyboardBackspace size={20} />
    </div>
    <span className="text-sm font-medium">Back to Employees</span>
  </button>

  {/* Top Bar: Search + Action */}
  <div className="relative bg-gray-900 rounded-t-xl p-4 flex items-center justify-between gap-4">
    {/* Search */}
    <div ref={searchWrapRef} className="relative w-full max-w-lg">
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Select or Search by name or emp id..."
        value={filters.search}
        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        onFocus={() => setSearchFocused(true)}
        className="w-full bg-white rounded-lg px-4 py-2 pr-10
                   border border-gray-300
                   text-sm
                   focus:ring-2 focus:ring-indigo-500
                   focus:border-indigo-500
                   outline-none transition"
      />
      <IoChevronDown
        size={18}
        className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-transform duration-200 ${
          searchFocused ? "rotate-180" : ""
        }`}
      />

      {/* Dropdown list only visible when search focused and employees fetched */}
     {/* Dropdown list */}
  {searchFocused && employees && employees.length > 0 && (

  <div
    className="absolute z-50 left-0 right-0 mt-1
      bg-white rounded-xl shadow-xl border border-gray-200
      max-h-64 overflow-auto"
  >
    {filteredEmployees.length ? (
      filteredEmployees.map((emp) => (
        <div
          key={emp._id}
          onClick={() => {
            fetchReport({
              employeeId: emp._id,
              month: filters.month,
              year: filters.year,
            });
            setFilters((f) => ({ ...f, search: "" }));
            setSearchFocused(false);
          }}
          className="flex items-center gap-3 px-4 py-3
            cursor-pointer
            hover:bg-indigo-50 transition
            rounded-lg mx-1 my-1"
        >
          {emp.avatar ? (
            <img
              src={emp.avatar}
              alt={emp.name}
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600
                flex items-center justify-center font-semibold text-xs shrink-0"
            >
              {((emp.name || "")
                .split(/\s+/)
                .slice(0, 2)
                .map((n) => n[0])
                .join("") || ""
              ).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{emp.name}</p>
            <p className="text-xs text-gray-500 truncate">{emp.empId} • {emp.mobile}</p>
          </div>
        </div>
      ))
    ) : (
      <div className="py-8 text-center text-sm text-gray-400">
        No matches found
      </div>
    )}
  </div>
)}

    </div>

    {/* Action buttons */}
    <div className="flex items-center justify-end gap-2">
      {(() => {
        const emp = report?.employee;
        const punchState = getTodayPunchState(emp);
        const baseClass = "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50";

        if (punchState === "NOT_MARKED")
          return (
            <button disabled={isProcessingPunch} onClick={() => handlePunch(emp)} className={`${baseClass} bg-green-100 text-green-700 hover:bg-green-600 hover:text-white`}>
              <FaUserCheck size={18} /> Mark Attendance
            </button>
          );
        if (punchState === "IN")
          return (
            <button disabled={isProcessingPunch} onClick={() => handlePunch(emp)} className={`${baseClass} bg-red-100 text-red-700 hover:bg-red-600 hover:text-white`}>
              Punch Out <IoMdLogOut size={20} />
            </button>
          );
        return (
          <button disabled={isProcessingPunch} onClick={() => handlePunch(emp)} className={`${baseClass} bg-green-100 text-green-700 hover:bg-green-600 hover:text-white`}>
            Punch In <IoMdLogOut size={20} className="rotate-180" />
          </button>
        );
      })()}
    </div>
  </div>

  {/* Report Content */}
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
    <div className="md:col-span-5">
      {/* Skeleton Loader */}
      {(loading || initializing) && (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-lg w-full"></div>
          <div className="h-12 bg-gray-200 rounded-lg w-full mt-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="h-28 bg-gray-200 rounded-lg"></div>
            <div className="h-28 bg-gray-200 rounded-lg"></div>
            <div className="h-28 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="mt-4 overflow-auto">
            <div className="h-8 bg-gray-200 rounded-lg mb-2 w-2/5"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg mb-2 w-full"></div>
            ))}
          </div>
        </div>
      )}

      {/* Actual report */}
      {!loading && report && (
        <>
          <EmployeeSummary emp={report.employee} isMobile={false} />
          <AttendanceFilter
            filters={filters}
            setFilters={setFilters}
            onSearch={() => {
              if (report?.employee?._id)
                fetchReport({ employeeId: report.employee._id, month: filters.month, year: filters.year });
            }}
            reportData={report}
            isMobile={false}
          />
          <MonthlySummaryCard
            summary={report.summary}
            days={report.days}
            table={report.table}
            holidays={holidays}
            isMobile={false}
            employee={report.employee}
          />
          <AttendanceTable
            days={report.days}
            data={report.table}
            isMobile={false}
            attendanceRaw={report.employee.attendance}
            onCellClick={handleCellClick}
            holidays={holidays}
          />
        </>
      )}

      {/* No Data */}
      {!initializing && !loading && !report && !filters.search && (
        <div className="text-center text-gray-400 py-10">
          No data available
        </div>
      )}
    </div>
  </div>

  <ManualAttendanceModal
    isOpen={manualModalOpen}
    onClose={() => setManualModalOpen(false)}
    employees={employees}
    onSubmit={handleManualAttendanceSubmit}
  />
  {selectedPunchDate && (
    <PunchRecordsModal
      isOpen={punchModalOpen}
      onClose={() => {
        setPunchModalOpen(false);
        setSelectedPunchDate(null);
      }}
      attendance={selectedPunchDate.attendance}
      date={selectedPunchDate.date}
      employeeName={report?.employee?.name}
      shiftHours={report?.employee?.shift || 8}
    />
  )}
</div>

  );
};

export default ReportsAttendance;

// <div className="relative bg-gray-900 rounded-t-xl p-4 flex items-center justify-between gap-4">
//       <input
//         type="text"
//         placeholder="Search by name or emp id..."
//         value={filters.search}
//         onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
//         onFocus={() => setSearchFocused(true)}
//         onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
//         className="w-100 bg-white rounded-xl px-4 py-2 focus:outline-none"
//       />
//       {/* <button
//         onClick={() => { const first = filteredEmployees[0]; if (first) fetchReport({ employeeId: first._id, month: filters.month, year: filters.year }) }}
//         className="px-8 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium text-sm lg:text-base"
//       >Search</button> */}

//       {/* Show live matches list when focused */}
//       {searchFocused && (
//         <div ref={searchWrapRef} className='absolute top-16 left-3.5 z-50'>
//           <div className="w-100 max-h-[50vh] bg-white/90 rounded-xl shadow-sm border border-gray-200 p-1 overflow-auto main-scroll">
//             {filteredEmployees.length ? (
//               filteredEmployees.map(emp => (
//                 <div key={emp._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded" onClick={() => { fetchReport({ employeeId: emp._id, month: filters.month, year: filters.year }); setFilters(f => ({ ...f, search: '' })) }}>
//                   {emp.avatar ? (
//                     <img src={emp.avatar} alt={emp.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
//                   ) : (
//                     <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm shrink-0">{((emp.name || '').split(/\s+/).slice(0, 2).map(n => n.charAt(0)).join('') || '').toUpperCase()}</div>
//                   )}
//                   <div className="flex-1 min-w-0">
//                     <div className="font-medium text-gray-800 truncate">{emp.name}</div>
//                     <div className="text-xs text-gray-500 truncate">{emp.empId} • {emp.mobile}</div>
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <div className="text-center text-sm text-gray-400 py-6">No matches found</div>
//             )}
//           </div>
//         </div>
//       )}

//       <div className="flex items-center justify-end gap-2">
//         {(() => {
//           const emp = report?.employee
//           const punchState = getTodayPunchState(emp)
//           if (punchState === 'NOT_MARKED') {
//             return (
//               <button
//                 title="Mark Attendance"
//                 disabled={isProcessingPunch}
//                 onClick={() => handlePunch(emp)}
//                 className="flex items-center gap-2 bg-white text-gray-800 px-3 py-1 rounded-full hover:text-white hover:bg-green-600"
//               >
//                 <FaUserCheck size={20} /> Mark Attendance
//               </button>
//             )
//           }
//           if (punchState === 'IN') {
//             return (
//               <button
//                 title="Punch Out"
//                 disabled={isProcessingPunch}
//                 onClick={() => handlePunch(emp)}
//                 className="flex items-center gap-2 bg-red-200 text-red-700 border border-white/40 px-3 py-1 rounded-full hover:text-white hover:bg-red-700"
//               >
//                 Punch Out <IoMdLogOut size={26} />
//               </button>
//             )
//           }
//           return (
//             <button
//               title="Punch In"
//               disabled={isProcessingPunch}
//               onClick={() => handlePunch(emp)}
//               className="flex items-center gap-2 bg-green-200 text-green-700 border border-white/40 px-3 py-1 rounded-full hover:text-white hover:bg-green-700"
//             >
//               Punch In <IoMdLogOut size={26} className="rotate-180" />
//             </button>
//           )
//         })()}
//       </div>
//     </div>
