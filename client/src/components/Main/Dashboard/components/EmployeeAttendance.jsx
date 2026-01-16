import React, { useState } from "react";

const EmployeeAttendance = ({ employees = [] }) => {
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const filteredEmployees = employees
    .slice(0, 5)
    .filter(emp => {
      if (employeeFilter === "all") return true;
      return emp.status === employeeFilter;
    });

  return (
   <div className="border rounded-xl shadow-lg overflow-hidden">
      {/* Header – EXACT like LiveAttendance */}
      
      <div className="flex justify-between items-center p-4 text-white bg-gray-900 rounded-t-xl font-semibold text-2xl">
        Recent Employees Attendance
        <select
          className="bg-white text-black rounded px-3 py-1 text-sm"
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>
      </div>

     <table className="table-auto w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-3 text-left">S.No</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Department</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp, index) => {
              const status = emp.status;
              const statusColor =
                status === "present"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700";

              const dotColor =
                status === "present"
                  ? "bg-green-500"
                  : "bg-red-500";

              return (
                <tr
                  key={emp._id}
                  className="border-b hover:bg-green-50 transition cursor-pointer"
                >
                  <td className="px-4 py-3">{index + 1}</td>

                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {emp.name}
                  </td>

                  <td className="px-4 py-3">
                    {emp.subDepartmentName || "—"}
                  </td>

                  <td className="px-4 py-3">
  <span
    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
      status === "present"
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700"
    }`}
  >
    {/* Animated dot */}
    <span className="relative flex h-2 w-2">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          status === "present" ? "bg-green-500" : "bg-red-500"
        }`}
      ></span>
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${
          status === "present" ? "bg-green-500" : "bg-red-500"
        }`}
      ></span>
    </span>

    {status}
  </span>
</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-6 text-gray-500">
                <div className="w-sm flex flex-col mx-auto items-center border-dashed border-2 border-gray-300 rounded-lg p-6 gap-4">
                  No attendance found
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeAttendance;
