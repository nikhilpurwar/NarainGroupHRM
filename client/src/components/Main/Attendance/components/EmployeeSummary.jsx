import { User, Building2, Users, DollarSign, CheckCircle } from 'lucide-react';

const EmployeeSummary = ({ emp }) => {
  if (!emp) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4 text-sm text-blue-700">
        No employee selected
      </div>
    );
  }

  const statusColor = emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 mb-4 border border-blue-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* ID Card */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Employee ID</span>
          </div>
          <div className="text-xl font-bold text-gray-800">{emp.empId || 'N/A'}</div>
        </div>

        {/* Name Card */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Name</span>
          </div>
          <div className="text-lg font-bold text-gray-800">{emp.name || 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-1">Father: {emp.fatherName || 'N/A'}</div>
        </div>

        {/* Department Card */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-green-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-green-600" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Department</span>
          </div>
          <div className="text-sm font-bold text-gray-800">{emp.headDepartment || 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-1">Sub: {emp.subDepartment || 'N/A'}</div>
        </div>

        {/* Group & Status Card */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-indigo-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-indigo-600" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Group</span>
          </div>
          <div className="text-sm font-bold text-gray-800">{emp.group || 'N/A'}</div>
          <div className={`text-xs font-semibold px-2 py-1 rounded mt-2 w-fit flex items-center gap-1 ${statusColor}`}>
            <CheckCircle size={12} />
            {emp.status || 'N/A'}
          </div>
        </div>

        {/* Salary Card */}
        {/* <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-600 shadow-sm hover:shadow-md transition md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-yellow-600" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Salary</span>
          </div>
          <div className="text-xl font-bold text-gray-800">₹{emp.salary?.toLocaleString() || '0'}</div>
        </div> */}

      </div>
    </div>
  );
};

export default EmployeeSummary;
