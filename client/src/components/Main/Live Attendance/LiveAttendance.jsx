import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { IoIosAddCircle } from "react-icons/io";
import { io as clientIO } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { ensureEmployees } from '../../../store/employeesSlice';
import { ensureTodayAttendance, updateAttendanceEntry } from '../../../store/attendanceSlice';
import { startLoading, stopLoading } from "../../../store/loadingSlice"; // global loader
import useAttendance from '../../../hooks/useAttendance'
import SkeletonRows from "../../SkeletonRows"; // skeleton rows

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";

const LiveAttendance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const employees = useSelector(s => s.employees.data || []);
  const attendanceMap = useSelector(s => s.attendance.map || {});
  const attendanceIso = useSelector(s => s.attendance.attendanceIso);

  const globalLoading = useSelector(s => s.loading.global); // global loader
  const [error, setError] = useState(null);

  // ensure attendance is populated in redux cache
  useAttendance()

  /* ================= FETCH EMPLOYEES & ATTENDANCE ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch(startLoading());
        await dispatch(ensureEmployees());
        await dispatch(ensureTodayAttendance());
      } catch (err) {
        setError("Failed to load attendance data");
        toast.error("Failed to load attendance data");
      } finally {
        dispatch(stopLoading());
      }
    };

    fetchData();
  }, [dispatch]);

  /* ================= SOCKET.IO LIVE UPDATES ================= */
  useEffect(() => {
    const socket = clientIO(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on("connect", () => console.log("✓ Socket.IO connected"));
    socket.on("connect_error", (err) => console.error("Socket.IO connection error:", err));

    socket.on("attendance:updated", (payload) => {
      if (!payload || !payload.employee) return;
      dispatch(updateAttendanceEntry({ employeeId: payload.employee, attendance: payload.attendance }));
    });

    socket.on("disconnect", () => console.log("Socket.IO disconnected"));

    return () => socket.disconnect();
  }, [API_URL, dispatch]);

  /* ================= HELPERS ================= */
  const getLastActivityTime = useCallback((att) => {
    if (!att) return 0;
    if (Array.isArray(att.punchLogs) && att.punchLogs.length > 0) {
      return new Date(att.punchLogs[att.punchLogs.length - 1].punchTime).getTime();
    }
    if (att.updatedAt) return new Date(att.updatedAt).getTime();
    if (att.date) return new Date(att.date).getTime();
    return 0;
  }, []);

  const getFirstInLastOut = useCallback((att) => {
    if (!att?.punchLogs?.length) return { firstIn: "—", lastOut: "—" };
    const ins = att.punchLogs.filter(p => p.punchType === "IN");
    const outs = att.punchLogs.filter(p => p.punchType === "OUT");
    return {
      firstIn: ins.length ? new Date(ins[0].punchTime).toLocaleTimeString() : "—",
      lastOut: outs.length ? new Date(outs[outs.length - 1].punchTime).toLocaleTimeString() : "—"
    };
  }, []);

  const handleProfileNavigate = useCallback((id) => {
    if (!id) return
    navigate(`/profile/${id}`)
  }, [navigate])

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const keyA = a._id || a.id;
      const keyB = b._id || b.id;
      return getLastActivityTime(attendanceMap[keyB]) - getLastActivityTime(attendanceMap[keyA]);
    });
  }, [employees, attendanceMap, getLastActivityTime]);

  const presentEmployees = useMemo(() => sortedEmployees.filter(emp => {
    const att = attendanceMap[emp._id || emp.id];
    return att && att.status !== 'absent';
  }), [sortedEmployees, attendanceMap]);

  const absentEmployees = useMemo(() => sortedEmployees.filter(emp => {
    const att = attendanceMap[emp._id || emp.id];
    return !att || att.status === 'absent';
  }), [sortedEmployees, attendanceMap]);

  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="h-full bg-white p-6 overflow-x-auto">
      <div>
        <div className="flex justify-between items-center p-4 text-white bg-gray-900 rounded-t-xl font-semibold text-2xl">
          Total Employees Present: {presentEmployees.length}
        </div>

        {/* Present Employees Table */}
        <table className="w-full table-auto border border-blue-200 rounded-b-xl mb-8">
          <thead>
            <tr className="bg-gray-100 text-gray-800 text-left">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Emp ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">First IN</th>
              <th className="px-4 py-3">Last OUT</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Skeleton Loader */}
            {globalLoading && <SkeletonRows rows={4} coln={8} />}

            {/* Attendance Data */}
            {!globalLoading && presentEmployees.length > 0 &&
              presentEmployees.map((item, index) => {
                const key = item._id || item.id;
                const att = attendanceMap[key];
                const { firstIn, lastOut } = getFirstInLastOut(att);
                const dateStr = att?.date ? new Date(att.date).toLocaleDateString() : "—";
                const dept = item.headDepartment?.name || "—";
                const status = att?.status || "—";
                const statusColor = status === 'absent' ? 'bg-red-100 text-red-700' : status === 'present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

                return (
                  <tr
                    key={key}
                    title="Click to view profile"
                    onClick={() => handleProfileNavigate(item._id)}
                    className="border-b hover:bg-green-50 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{item.empId}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                    <td className="px-4 py-3">{dateStr}</td>
                    <td className="px-4 py-3">{dept}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{firstIn}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{lastOut}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                        <span className={`w-2 h-2 rounded-full animate-ping ${status === 'present' ? 'bg-green-500' : status === 'absent' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            }

            {/* Empty State */}
            {!globalLoading && presentEmployees.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-500">
                  No live attendance found
                </td>
              </tr>
            )}
          </tbody>
        </table>
          {/* Absent Employees Table */}         
          {/* <div className="flex justify-between items-center p-4 text-white bg-gray-900 rounded-t-xl font-semibold text-2xl">
            Total Employees Absent : {absentEmployees.length}
          </div>
          <table className="w-full table-auto rounded-xl border border-red-200">
            <thead>
              <tr className="bg-gray-100 text-gray-800 text-left">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Emp ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">First IN</th>
                <th className="px-4 py-3">Last OUT</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {absentEmployees.length > 0 ? (
                absentEmployees.map((item, index) => {
                  const key = item._id ? item._id.toString() : item.id;
                  const att = attendanceMap[key];
                  const dateStr = att && att.date ? new Date(att.date).toLocaleDateString() : "—";
                  const inTime = att?.inTime || "—";
                  const outTime = att?.outTime || "—";
                  const status = att?.status || "absent";
                  const dept = item.headDepartment?.name || "—";

                  const statusColor = 'bg-red-100 text-red-700';

                  return (
                    <tr
                      key={key}
                      title="Click too view profile"
                      onClick={() => {
                        navigate(`/profile/${item._id}`);
                      }}
                      className="border-b hover:bg-red-50 transition cursor-pointer"
                    >
                      <td className="px-4 py-3">{index + 1}</td>
                      <td
                        title="Click too view profile"
                        className="px-4 py-3 font-medium text-gray-700"
                      >
                        {item.empId}
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                      <td className="px-4 py-3">{dateStr}</td>
                      <td className="px-4 py-3">{dept}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{inTime}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{outTime}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">
                    <div className="w-sm flex flex-col mx-auto items-center border-dashed border-2 border-gray-300 rounded-lg p-6 gap-4">
                      No absentees yet
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table> */}
        </div>
      
    </div>
  );
};

export default memo(LiveAttendance);
