import React, { useState } from "react";
import Spinner from "../../../utility/Spinner";

const EmployeeAttendance = ({ employees = [], loading }) => {
  const [employeeFilter, setEmployeeFilter] = useState("present");

  // 🔹 USE BACKEND STATUS ONLY
  const filteredEmployees = employees
    .filter((emp) => {
      if (employeeFilter === "all") return true;
      return emp.status === employeeFilter;
    })
    .slice(0, 5);

  return (
    <div className="border rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-gray-900 rounded-t-xl font-semibold text-xl">
        Recent Employees Attendance
        <select
          className="bg-white text-black rounded px-3 py-1 text-sm"
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="present">Present</option>
          <option value="pending">Pending</option>
          <option value="absent">Absent</option>
        </select>
      </div>

      <table className="table-auto w-full bg-white ">
        <thead className="bg-gray-100 text-gray-700 ">
          <tr>
            <th className="px-4 py-3 text-left">S.No</th>
            <th className="px-4 py-3 text-left">Emp.ID</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Department</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>

        {loading ? (
          <tbody>
            {[...Array(2)].map((_, index) => (
              <tr key={index}>
                {[...Array(5)].map((_, i) => (
                  <td key={i} className="px-4 py-3">
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ) : (
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp, index) => {
                const status = emp.status;

                return (
                  <tr
                    key={emp._id || emp.id}
                    className="border-t hover:bg-gray-100 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">{emp.empId}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {emp.name}
                    </td>
                    <td className="px-4 py-3">
                      {emp.subDepartmentName || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${status === "present"
                            ? "bg-green-100 text-green-700"
                            : status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${status === "present"
                              ? "bg-green-500"
                              : status === "pending"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                        />
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  No attendance found
                </td>
              </tr>
            )}
          </tbody>
        )}
      </table>
    </div>
  );
};

export default EmployeeAttendance;
