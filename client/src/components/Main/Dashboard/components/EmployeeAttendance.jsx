import React from "react";

const EmployeeAttendance = () => {
  return (
    <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 text-white bg-gray-900 font-semibold text-lg rounded-t-xl">
        Employee Attendance
      </div>

      {/* Table */}
      <table className="table-auto w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Department</th>
            <th className="px-4 py-2 text-left">In Time</th>
            <th className="px-4 py-2 text-left">Out Time</th>
            <th className="px-4 py-2 text-left">List Time In-Out</th>
            <th className="px-4 py-2 text-left">Working Hours</th>
            <th className="px-4 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 border-t">Nitesh Kumar Yadav</td>
            <td className="px-4 py-3 border-t">Plant Section</td>
            <td className="px-4 py-3 border-t">13:26:00</td>
            <td className="px-4 py-3 border-t">15:27:00</td>
            <td className="px-4 py-3 border-t">
              In-09:30:00 Out-17:30:00 <br />
              In-13:26:00 Out-15:27:00
            </td>
            <td className="px-4 py-3 border-t">10:02</td>
            <td className="border-t text-center">
              <span className="inline-block h-4 w-4 rounded-full bg-red-600 animate-pulse"></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeAttendance;