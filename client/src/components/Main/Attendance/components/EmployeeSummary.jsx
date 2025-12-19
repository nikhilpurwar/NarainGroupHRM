import { User, Building2, Users, DollarSign, CheckCircle, Smartphone, Mail, Calendar } from 'lucide-react';

const EmployeeSummary = ({ emp, isMobile }) => {
  if (!emp) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4 text-sm text-blue-700">
        No employee selected
      </div>
    );
  }

  const statusColor = emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  if (isMobile) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-4 mb-4 border border-blue-200">
        {/* Mobile Compact Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-gray-800">{emp.name || 'N/A'}</div>
            <div className="text-xs text-gray-500">ID: {emp.empId || 'N/A'}</div>
          </div>
          <div className={`text-xs font-semibold px-2 py-1 rounded ${statusColor}`}>
            {emp.status || 'N/A'}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-start gap-2">
            <Building2 size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-700">{emp.headDepartment?.name || emp.headDepartment || 'N/A'}</div>
              <div className="text-xs text-gray-500">{emp.subDepartment?.name || emp.subDepartment || 'N/A'}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Users size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-700">{emp.group?.name || emp.group || 'N/A'}</div>
              <div className="text-xs text-gray-500">Group</div>
            </div>
          </div>

          {emp.fatherName && (
            <div className="col-span-2 flex items-start gap-2 mt-1">
              <User size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-gray-500">Father: </span>
                <span className="font-medium">{emp.fatherName}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop/Tablet View
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-b-xl shadow p-4 sm:p-6 mb-4 border border-blue-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* ID Card */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border-l-4 border-blue-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-blue-600 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Employee ID</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-800 truncate">{emp.empId || 'N/A'}</div>
        </div>

        {/* Name Card */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border-l-4 border-purple-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-purple-600 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Name</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-gray-800 truncate">{emp.name || 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-1 truncate">Father: {emp.fatherName || 'N/A'}</div>
        </div>

        {/* Department Card */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border-l-4 border-green-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={14} className="text-green-600 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Department</span>
          </div>
          <div className="text-sm font-bold text-gray-800 truncate">{emp.headDepartment?.name || emp.headDepartment || 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-1 truncate">Sub: {emp.subDepartment?.name || emp.subDepartment || 'N/A'}</div>
        </div>

        {/* Group & Status Card */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border-l-4 border-indigo-600 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-indigo-600 flex-shrink-0" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Designation / Shift</span>
          </div>
          <div className="text-sm font-bold text-gray-800 truncate">{emp.designation?.name || emp.designation || 'N/A'}</div>
          <div className="text-xs text-gray-500 mt-1">Shift: 8h</div>
          <div className={`text-xs font-semibold px-2 py-1 rounded mt-2 w-fit flex items-center gap-1 ${statusColor}`}>
            <CheckCircle size={12} />
            {emp.status || 'N/A'}
          </div>
        </div>
      </div>

      {/* Additional Info for larger screens */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-100">
        {emp.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail size={14} className="text-gray-400" />
            <span className="truncate">{emp.email}</span>
          </div>
        )}
        {emp.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Smartphone size={14} className="text-gray-400" />
            <span>{emp.phone}</span>
          </div>
        )}
        {emp.joiningDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} className="text-gray-400" />
            <span>Joined: {new Date(emp.joiningDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeSummary;