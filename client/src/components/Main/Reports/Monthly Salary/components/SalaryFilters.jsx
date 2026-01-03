import React, { memo } from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { useHierarchy } from '../../../../../context/HierarchyContext';

const SalaryFilters = memo(({ 
  filters, 
  months,
  years,
  onFilterChange, 
  onApplyFilters, 
  onClearFilters 
}) => {
  const { subDepartments } = useHierarchy();

  return (
    <div >
      <form onSubmit={onApplyFilters}>
        <div className="flex items-end justify-between">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Employee Name Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Name/ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="employeeName"
                  placeholder="Search by name or ID..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.employeeName}
                  onChange={onFilterChange}
                />
              </div>
            </div>

            {/* Month & Year Selects */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    name="month"
                    className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.month}
                    onChange={onFilterChange}
                  >
                    <option value="">Select Month</option>
                    {months.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    name="year"
                    className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.year}
                    onChange={onFilterChange}
                  >
                    <option value="">Select Year</option>
                    {years.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Sub Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Department
              </label>
              <select
                name="subDepartment"
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.subDepartment}
                onChange={onFilterChange}
              >
                <option value="">All Sub Departments</option>
                {subDepartments.map(sd => (
                  <option key={sd._id} value={sd._id}>
                    {sd.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {/* <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
              >
                <Filter size={18} />
                Apply Filters
              </button> */}
              <button
                type="button"
                onClick={onClearFilters}
                className="h-11.5 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition duration-200"
                title="Clear filters"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
});

SalaryFilters.displayName = 'SalaryFilters';

export default SalaryFilters;
