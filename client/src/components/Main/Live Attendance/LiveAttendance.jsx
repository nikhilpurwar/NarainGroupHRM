import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { IoIosAddCircle } from "react-icons/io";
import { io as clientIO } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const API = `${API_URL}/api/employees`;
const ATTENDANCE_API = `${API_URL}/api/attendance-report`;

const LiveAttendance = () => {
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceIso, setAttendanceIso] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eRes, aRes] = await Promise.all([
          axios.get(API),
          axios.get(`${ATTENDANCE_API}/today`),
        ]);

        const emps = eRes.data?.data || [];
        setEmployees(emps);

        const attendPayload = aRes.data?.data || {};
        setAttendanceIso(attendPayload.attendanceIso || null);

        // normalize map: keys are employee ids (strings)
        const map = {};
        if (attendPayload.map) {
          for (const k of Object.keys(attendPayload.map)) {
            map[k] = attendPayload.map[k];
          }
        }
        setAttendanceMap(map);
      } catch (err) {
        console.error("Failed to load live attendance:", err);
        toast.error("Failed to load live attendance");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const socket = clientIO(API_URL, { transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      // connected
    });

    socket.on("attendance:updated", (payload) => {
      if (!payload || !payload.employee) return;
      setAttendanceMap((prev) => ({ ...prev, [payload.employee]: payload.attendance }));
    });

    socket.on("disconnect", () => { });
    return () => {
      socket.disconnect();
    };
  }, []);

  const presentCount = Object.values(attendanceMap).filter(a => a && a.status !== 'absent').length;

  return (
    <div className="h-full bg-white p-6 overflow-x-auto">
      {loading ? (
        <p className="text-center py-6 text-gray-500">Loading live attendance...</p>
      ) : (
        <div>
          <div className="flex justify-between items-center p-4 text-white bg-gray-900 rounded-t-xl font-semibold text-2xl">
            Total Employees Present : {presentCount}
          </div>

          <table className="w-full table-auto rounded-b-xl border border-blue-200">
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
              {employees.length > 0 ? (
                employees.map((item, index) => {
                  const key = item._id ? item._id.toString() : item.id;
                  const att = attendanceMap[key];
                  const dateStr = att && att.date ? new Date(att.date).toLocaleDateString() : "—";
                  const inTime = att?.inTime || "—";
                  const outTime = att?.outTime || "—";
                  const status = att?.status || "—";
                  const dept = item.headDepartment?.name || "—";

                  const statusColor = status === 'absent' ? 'bg-red-100 text-red-700' : status === 'present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

                  return (
                    <tr
                      key={key}
                      title="Click too view profile"
                      onClick={() => {
                        navigate(`/profile/${item._id}`);
                      }}
                      className="border-b hover:bg-gray-100 transition cursor-pointer"
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
                          <span className={`w-2 h-2 rounded-full ${status === 'present' ? 'bg-green-500' : status === 'absent' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
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
                      No live attendance found
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LiveAttendance;
