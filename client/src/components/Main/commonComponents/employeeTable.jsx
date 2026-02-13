import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  Trash2,
} from "lucide-react";
import axios from "axios";
// import { Link, useNavigate } from 'react-router-dom'
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import Spinner from "../../utility/Spinner";

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

const TableSkeletonRow = ({ showActions }) => {
  return (
    <tr className="animate-pulse border-b">

      {/* index */}
      <td className="px-4 py-4">
        <div className="h-4 w-6 bg-gray-200 rounded" />
      </td>

      {/* emp id */}
      <td className="px-4 py-4">
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </td>

      {/* name + avatar */}
      <td className="px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-300" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded opacity-70" />
        </div>
      </td>

      <td className="px-4 py-4"><div className="h-4 w-28 bg-gray-200 rounded" /></td>
      <td className="px-4 py-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
      <td className="px-4 py-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
      <td className="px-4 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
      <td className="px-4 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
      <td className="px-4 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>

      {/* status toggle skeleton */}
      <td className="px-4 py-4">
        <div className="h-5 w-10 rounded-full bg-gray-300" />
      </td>

      {/* 👇 Attendance page only */}
      {showActions && (
        <>
          {/* present bubble */}
          <td className="px-4 py-4 text-center">
            <div className="h-6 w-10 bg-gray-300 rounded-full mx-auto" />
          </td>

          {/* absent bubble */}
          <td className="px-4 py-4 text-center">
            <div className="h-6 w-10 bg-gray-300 rounded-full mx-auto" />
          </td>
        </>
      )}

      {/* action buttons skeleton */}
      <td className="px-4 py-4">
        {showActions ? (
          /* Attendance page actions (usually 1–2 buttons wide) */
          <div className="flex justify-center gap-3">
            <div className="w-12 h-8 bg-gray-300 rounded-full" />
          </div>
        ) : (
          /* Employee page actions (icon buttons) */
          <div className="flex justify-center gap-2">
            <div className="w-9 h-9 bg-gray-300 rounded-lg" />
            <div className="w-9 h-9 bg-gray-300 rounded-lg" />
            <div className="w-9 h-9 bg-gray-300 rounded-lg" />
          </div>
        )}
      </td>
    </tr>
  );
};



const EmployeeTable = ({
  employees = [],
  onDelete = () => { },
  //   rowsPerPage = 5,
  initialDepartment = "",
  onEdit = () => { },
  onToggleStatus = () => { },
  onNameClick = () => { },
  onView = () => { },
  renderActions, // optional custom action renderer (emp) => JSX
  showFilters = true,
  filtersOptions = {}, // { departments:[], subDepartments:[], groups:[] }
  loading = false,
}) => {
  const [filtered, setFiltered] = useState(employees || []);
  const [nameSearch, setNameSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [subDepartment, setSubDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Schema options states
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  // Local optimistic status overrides and pending toggles per employee id
  const [localStatusMap, setLocalStatusMap] = useState({});
  const [pendingToggles, setPendingToggles] = useState({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  //   const TableSkeletonRow = ({ columns = 11 }) => {
  //   return (
  //     <tr className="animate-pulse">
  //       {Array.from({ length: columns }).map((_, i) => (
  //         <td key={i} className="px-4 py-3">
  //           <div className="h-4 bg-gray-200 rounded w-full"></div>
  //         </td>
  //       ))}
  //     </tr>
  //   );
  // };

  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  // When user clicks delete button
  const handleDeleteClick = (emp) => {
    setEmployeeToDelete(emp);
    setShowDeleteConfirm(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteConfirm(false);
    setEmployeeToDelete(null);
  };

  // DELETE EMPLOYEE CONFIRMATION MODAL
  const DeleteEmployeeConfirmationModal = () => {
    if (!showDeleteConfirm || !employeeToDelete) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Employee
              </h3>
              <p className="text-sm text-gray-600">
                This action cannot be undone
              </p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={employeeToDelete.avatar || DEFAULT_AVATAR}
                alt="Employee"
                className="w-12 h-12 rounded-full border"
              />
              <div>
                <p className="font-semibold text-gray-900">
                  {employeeToDelete.name}
                </p>
                <p className="text-sm text-gray-500">
                  Employee ID: {employeeToDelete.empId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 gap-x-19  text-sm">
              <div>
                <span className="text-gray-600">Department:</span>
                <span className="ml-1 font-medium whitespace-nowrap">
                  {employeeToDelete.headDepartment?.name || "—"}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Sub Dept:</span>
                <span className="ml-1 font-medium">
                  {employeeToDelete.subDepartment?.name || "—"}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Status:</span>
                <span
                  className={`ml-1 px-2 py-1 rounded-full text-xs ${employeeToDelete.status === "active"
                      ? "bg-green-200 text-green-700"
                      : "bg-red-100 text-red-600"
                    }`}
                >
                  {employeeToDelete.status}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Joined:</span>
                <span className="ml-1">
                  {" "}
                  <strong>
                    {formatDate(employeeToDelete?.createdAt)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={closeDeleteModal}
              disabled={deleting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };


  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;

    // ✅ ONLY notify parent
    onDelete(employeeToDelete._id);


    // ✅ close modal immediately
    closeDeleteModal();
  };

  useEffect(() => {
    if (initialDepartment) {
      setDepartment(initialDepartment);
    }
  }, [initialDepartment]);

  // Fetch all schema options from backend
  useEffect(() => {
    const fetchSchemaOptions = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5100";

        const token =
          typeof window !== "undefined"
            ? sessionStorage.getItem("token") || localStorage.getItem("token")
            : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [deptsRes, subDeptsRes, designationsRes] = await Promise.all([
          axios.get(`${apiUrl}/api/department/head-departments`, { headers }),
          axios.get(`${apiUrl}/api/department/sub-departments`, { headers }),
          axios.get(`${apiUrl}/api/department/designations`, { headers }),
        ]);

        setDepartments(deptsRes.data.data || []);
        setSubDepartments(subDeptsRes.data.data || []);
        setDesignations(designationsRes.data.data || []);
        setSchemaLoading(false);
      } catch (error) {
        console.error("Error fetching schema options:", error);
        setSchemaLoading(false);
      }
    };

    fetchSchemaOptions();
  }, []);

  useEffect(() => setFiltered(employees || []), [employees]);


  useEffect(() => {
    let temp = [...employees];
    if (nameSearch.trim()) {
      const search = nameSearch.toLowerCase();
      temp = temp.filter(
        (e) =>
          e.name?.toLowerCase().includes(search) ||
          e.empId?.toLowerCase().includes(search),
      );
    }
    if (department)
      temp = temp.filter((e) => e.headDepartment?._id === department);
    if (subDepartment)
      temp = temp.filter((e) => e.subDepartment?._id === subDepartment);
    if (designation)
      temp = temp.filter((e) => e.designation?._id === designation);
    setFiltered(temp);
    setCurrentPage(1);
  }, [nameSearch, department, subDepartment, designation, employees]);

  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const indexOfLast = currentPage * pageSize;
  const indexOfFirst = indexOfLast - pageSize;
  const currentData = filtered.slice(indexOfFirst, indexOfLast);

  // Use monthly summary from backend for accurate present/absent counts
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const currentYear = String(new Date().getFullYear());
  const [summaryMap, setSummaryMap] = useState({});

  // When table requires action columns (present/absent) fetch monthly summaries for employees on current page
useEffect(() => {
  let mounted = true
  if (!renderActions || currentData.length === 0) return
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5100"

  const fetchSummaries = async () => {
    try {
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token")
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const results = await Promise.all(
        currentData.map(async emp => {
          const id = emp._id || emp.id

          const res = await axios.get(`${apiUrl}/api/attendance-report`, {
            params: {
              employeeId: id,
              month: currentMonth,
              year: currentYear
            },
            headers
          })

          const { days = [], table = {}, holidays = [] } = res.data?.data || {}

          let present = 0
          let absent = 0

          const statusRow = table['Status'] || []

          for (let i = 0; i < days.length; i++) {
            const iso = days[i].iso
            const dayDate = new Date(iso)
            dayDate.setHours(0,0,0,0)

            // skip holidays
            if (holidays.some(h => h.date?.split('T')[0] === iso)) continue

            // skip before joining
            if (emp.createdAt && dayDate < new Date(emp.createdAt)) continue

            const st = String(statusRow[i] || '').toLowerCase()

            if (st === 'present' || st === 'halfday') present++
            else if (st === 'absent') absent++
          }

          return { id, present, absent }
        })
      )

      if (!mounted) return

      const map = {}
      results.forEach(r => {
        map[r.id] = { present: r.present, absent: r.absent }
      })

      setSummaryMap(map)

    } catch (err) {
      console.error("Summary recompute failed", err)
    }
  }

  fetchSummaries()
  return () => { mounted = false }
}, [renderActions, currentData, currentMonth, currentYear]) // <-- error pointing here




  const countsMap = useMemo(() => summaryMap, [summaryMap]);

  const goNext = () => setCurrentPage((p) => (p < totalPages ? p + 1 : p));
  const goPrev = () => setCurrentPage((p) => (p > 1 ? p - 1 : p));

  const clearFilters = () => {
    setNameSearch("");
    setDepartment("");
    setSubDepartment("");
    setDesignation("");
    setCurrentPage(1);
  };

  const StatusToggle3D = ({ isActive, onClick, isPending = false }) => {
    return (
      <button
        onClick={onClick}
        type="button"
        title={isActive ? "Set Inactive" : "Set Active"}
        className={`
                relative w-9 h-5 rounded-full
                transition-all duration-300 ease-out
                focus:outline-none
                flex items-center
                ${isActive
            ? "bg-gradient-to-r from-green-400 to-green-600 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(34,197,94,0.45)]"
            : "bg-gradient-to-r from-red-400 to-red-600 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(239,68,68,0.45)]"
          }
            `}
      >
        {/* Toggle Knob */}
        <span
          className={`
                    absolute top-[4px] left-[4px] w-3 h-3 rounded-full
                    bg-gradient-to-b from-white via-gray-100 to-gray-300
                    shadow-[0_2px_5px_rgba(0,0,0,0.45)]
                    transition-transform duration-300 ease-out
                    ${isActive ? "translate-x-4" : "translate-x-0"}
                `}
        />

        {/* Small spinner when pending */}
        <span
          className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isPending ? "" : "hidden"}`}
        >
          <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin"></span>
        </span>

        {/* ON / OFF text */}
        {/* <span
                    className={`
                    absolute inset-0 flex items-center justify-center
                    text-[9px] font-bold tracking-wide text-white
                    pointer-events-none select-none
                    drop-shadow-sm
                `}
                >
                    {isActive ? 'Active' : 'Inactive'}
                </span> */}
      </button>
    );
  };

  // Optimistic toggle handler: updates UI immediately, calls API (or delegates to onToggleStatus), disables only that row, and reverts on failure
  const toggleStatusOptimistic = async (empId, currentStatus) => {
    const prev = currentStatus;
    const next = prev === "active" ? "inactive" : "active";

    // set optimistic UI
    setLocalStatusMap((s) => ({ ...s, [empId]: next }));
    setPendingToggles((p) => ({ ...p, [empId]: true }));

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("token") || localStorage.getItem("token")
          : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // If parent handler returns a promise, use it. Otherwise, call API directly.
      let parentResult = null;
      try {
        parentResult = onToggleStatus && onToggleStatus(empId, prev);
      } catch (e) {
        parentResult = null;
      }

      if (parentResult && typeof parentResult.then === "function") {
        await parentResult;
      } else {
        // call API directly
        await axios.put(
          `${apiUrl}/api/employees/${empId}`,
          { status: next },
          { headers },
        );
      }

      // success: clear pending for this row
      setPendingToggles((p) => {
        const np = { ...p };
        delete np[empId];
        return np;
      });
      // keep optimistic localStatus; parent/refresh may overwrite later
    } catch (err) {
      console.error("Failed to update status", err);
      // revert optimistic UI
      setLocalStatusMap((s) => ({ ...s, [empId]: prev }));
      setPendingToggles((p) => {
        const np = { ...p };
        delete np[empId];
        return np;
      });
    }
  };

  return (
    <div>
      {showFilters && (
        <div className="bg-white p-6 rounded-b-xl sticky shadow-lg mb-6 border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-9 gap-4 mb-4">
            {/* Search Input */}
            <div className="relative col-span-2">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="text-gray-400" size={18} />
              </div>
              <input
                type="text"
                placeholder="Search by Name/Emp ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 
                         transition-all duration-200 bg-white shadow-sm
                         hover:border-gray-300 text-sm font-medium text-gray-700"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>

            {/* Department Dropdown */}
            <div className="relative col-span-2 group">
              <select
                className="modern-dropdown w-full pl-4 pr-10 py-2.5 rounded-lg 
                         border border-gray-200 bg-white shadow-sm
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                         hover:border-gray-300 transition-all duration-200
                         text-sm font-medium text-gray-700 cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={schemaLoading}
              >
                <option value="" className="text-gray-400">
                  Select Department
                </option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id} className="py-2">
                    {d.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>

            {/* Sub-Department Dropdown */}
            <div className="relative col-span-2 group">
              <select
                className="modern-dropdown w-full pl-4 pr-10 py-2.5 rounded-lg 
                         border border-gray-200 bg-white shadow-sm
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                         hover:border-gray-300 transition-all duration-200
                         text-sm font-medium text-gray-700 cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
                value={subDepartment}
                onChange={(e) => setSubDepartment(e.target.value)}
                disabled={schemaLoading}
              >
                <option value="" className="text-gray-400">
                  Select Sub Department
                </option>
                {subDepartments.map((d) => (
                  <option key={d._id} value={d._id} className="py-2">
                    {d.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>

            {/* Designation Dropdown */}
            <div className="relative col-span-2 group">
              <select
                className="modern-dropdown w-full pl-4 pr-10 py-2.5 rounded-lg 
                         border border-gray-200 bg-white shadow-sm
                         focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
                         hover:border-gray-300 transition-all duration-200
                         text-sm font-medium text-gray-700 cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                disabled={schemaLoading}
              >
                <option value="" className="text-gray-400">
                  Select Designation
                </option>
                {designations.map((d) => (
                  <option key={d._id} value={d._id} className="py-2">
                    {d.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>

            {/* Clear Button */}
            <button
              title="Clear Filters"
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2 
                     bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 
                     text-gray-700 rounded-lg font-medium transition-all duration-200
                     border border-gray-200 shadow-sm hover:shadow
                     hover:border-gray-300 active:scale-95"
            >
              <RotateCcw size={18} className="text-gray-600" />
              <span className="font-medium">Clear</span>
            </button>
          </div>
        </div>
      )}

      <div className=" bg-white py-4 rounded-xl shadow-md  overflow-x-auto">
        {/* {loading ? (
          <Spinner />
        ) : ( */}
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-100 text-gray-800 text-left">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Emp ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Father Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Sub Dept.</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Status</th>
              {renderActions && (
                <>
                  <th title="Total Present this Month" className="px-4 py-3">
                    Present
                  </th>
                  <th title="Total Absent this Month" className="px-4 py-3">
                    Absent
                  </th>
                </>
              )}
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>


          <tbody>
            {loading ? (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableSkeletonRow
                    key={i}
                    showActions={!!renderActions}
                  />
                ))}
              </>
            ) : currentData.length ? (
              currentData.map((emp, i) => {
                const statusClass =
                  emp.attendanceStatus === "present"
                    ? "bg-green-100"
                    : emp.attendanceStatus === "absent"
                      ? "bg-red-100"
                      : "";
                return (
                  <tr
                    key={emp.id || emp._id}
                    className={`border-b transition ${statusClass} fade-in`}
                  >
                    <td className="px-4 py-3">{indexOfFirst + i + 1}</td>
                    <td
                      // onClick={(e) => { e.stopPropagation(); onNameClick(emp) }}
                      className="px-4 py-3"
                    >
                      {emp.empId}
                    </td>
                    <td
                      title={
                        renderActions
                          ? "Click to View Attendace Report"
                          : "Click to View Profile"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onNameClick(emp);
                      }}
                      className="px-4 py-3 my-1 flex items-center gap-3 hover:bg-gray-200 hover:rounded-4xl cursor-pointer"
                    >
                      {emp.avatar ? (
                        <img
                          src={emp.avatar || DEFAULT_AVATAR}
                          alt="Profile"
                          className="w-10 h-10 rounded-full border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border flex items-center justify-center bg-gray-300 text-gray-700 font-bold">
                          {emp.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-gray-900 text-left hover:underline cursor-pointer">
                        {emp.name.split(" ")[0]} <br />{" "}
                        {emp.name.split(" ")[1]}
                      </span>
                    </td>
                    <td className="px-4 py-3">{emp.fatherName || "—"}</td>
                    <td className="px-4 py-3">{emp.mobile || "—"}</td>
                    <td className="px-4 py-3">
                      {typeof emp.salary === "number"
                        ? `₹${emp.salary}`
                        : emp.salary
                          ? `₹${emp.salary}`
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {emp.headDepartment?.name || emp.headDepartment || ""}
                    </td>
                    <td className="px-4 py-3">
                      {emp.subDepartment?.name || emp.subDepartment || ""}
                    </td>
                    <td className="px-4 py-3">
                      {emp.designation?.name || emp.designation || ""}
                    </td>
                    <td className="px-4 py-3">
                      {!renderActions
                        ? (() => {
                          const id = emp._id || emp.id;
                          const displayed =
                            localStatusMap[id] ?? emp.status;
                          const isPending = Boolean(pendingToggles[id]);
                          return (
                            <StatusToggle3D
                              isActive={displayed === "active"}
                              isPending={isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isPending)
                                  toggleStatusOptimistic(
                                    id,
                                    localStatusMap[id] ?? emp.status,
                                  );
                              }}
                            />
                          );
                        })()
                        : (() => {
                          const id = emp._id || emp.id;
                          const displayed =
                            localStatusMap[id] ?? emp.status;
                          const isPending = Boolean(pendingToggles[id]);
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isPending)
                                  toggleStatusOptimistic(
                                    id,
                                    localStatusMap[id] ?? emp.status,
                                  );
                              }}
                              disabled={isPending}
                              className={`px-3 py-1 rounded-full text-sm ${displayed === "active" ? "bg-green-200 text-green-600" : "bg-red-100 text-red-600"} ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                              <span
                                className={`inline-flex items-center ${isPending ? "gap-2" : ""}`}
                              >
                                {isPending && (
                                  <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                                )}
                                <span>
                                  {displayed === "active"
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </span>
                            </button>
                          );
                        })()}
                    </td>

                    {/* shows total Present and Absent of current month (computed from employee.attendance when available) */}
                    {renderActions && (
                      <>
                        <td
                          title="Total Present this Month"
                          className="px-8 text-center text-green-700 font-bold"
                        >
                          {(() => {
                            const key = emp._id || emp.id;
                            const v = countsMap[key];
                            return v && typeof v.present === "number" ? (
                              <div className="border-b-2 bg-green-200 rounded-full shadow-2xl">
                                {v.present}
                              </div>
                            ) : (
                              <div className="flex space-x-0.5">
                                <span className="w-1 h-1 bg-gray-900 rounded-full animate-bounce"></span>
                                <span className="w-1 h-1 bg-gray-900 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1 h-1 bg-gray-900 rounded-full animate-bounce [animation-delay:-0.6s]"></span>
                              </div>
                            );
                          })()}
                        </td>
                        <td
                          title="Total Absent this Month"
                          className="px-8 text-center text-red-600 font-bold"
                        >
                          {(() => {
                            const key = emp._id || emp.id;
                            const v = countsMap[key];
                            return v && typeof v.absent === "number" ? (
                              <div className="border-b-2 bg-red-200 rounded-full shadow-2xl">
                                {v.absent}
                              </div>
                            ) : (
                              <div className="flex space-x-0.5">
                                <span className="w-1 h-1 bg-gray-900 rounded-full animate-bounce"></span>
                                <span className="w-1 h-1 bg-gray-900 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1 h-1 bg-gray-900 rounded-full animate-bounce [animation-delay:-0.6s]"></span>
                              </div>
                            );
                          })()}
                        </td>
                      </>
                    )}
                    <td className="text-center">
                      {renderActions ? (
                        <div className="flex justify-start items-center">
                          {renderActions(emp)}
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-2 mr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof onView === "function") onView(emp);
                              else onNameClick(emp);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors hover:scale-110 cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={20} />
                          </button>
                          <button
                            title="Edit Employee"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(emp);
                            }}
                            className="p-1 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors hover:scale-110 cursor-pointer"
                          >
                            <FiEdit size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(emp);
                            }}
                            title="Delete Employee"
                            className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition-colors hover:scale-110 cursor-pointer"
                          >
                            <MdDeleteOutline size={22} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={renderActions ? 13 : 11}
                  className="text-center py-6 text-gray-500"
                >
                  <div className="w-sm flex flex-col mx-auto items-center border-dashed border-2 border-gray-300 rounded-lg p-6 gap-4">
                    No employees found
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>



        { /* DeleteConfirmationModal */}
        <DeleteEmployeeConfirmationModal />


        {filtered.length > 0 && (
          <div className="flex flex-col md:flex-row sticky left-0 md:items-center md:justify-between gap-3 mt-6 pb- px-6">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {filtered.length === 0 ? 0 : indexOfFirst + 1} to{" "}
                {Math.min(indexOfLast, filtered.length)} of {filtered.length}
              </div>

              <label className="text-sm text-gray-600">Rows:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border rounded px-2 py-1"
              >
                {/* <option value={2}>2</option> */}
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={goPrev}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40"
              >
                <ChevronLeft />
              </button>
              <span className="font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={goNext}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeTable;
