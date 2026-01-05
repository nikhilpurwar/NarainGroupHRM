import React from 'react'
import { FiClock, FiX, FiUsers } from 'react-icons/fi'
import { MdOutlineCurrencyRupee } from 'react-icons/md'
import { FaSearch } from "react-icons/fa";

const RulesFilterBar = ({
  searchTerm,
  setSearchTerm,
  activeFilters,
  setActiveFilters,
  filteredCount,
}) => {
  const handleClear = () => {
    setSearchTerm('')
    setActiveFilters({ fixedSalary: null, allowOT: null })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search rules by name or department..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveFilters({
                ...activeFilters,
                fixedSalary: !activeFilters.fixedSalary,
              })
            }
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeFilters.fixedSalary === true
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MdOutlineCurrencyRupee />
            Fixed Salary
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveFilters({
                ...activeFilters,
                allowOT: activeFilters.allowOT === null ? true : null,
              })
            }
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              activeFilters.allowOT === true
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FiClock />
            OT Allowed
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <FiX />
            Clear Filters
          </button>
        </div>

        <div className="text-left md:text-right">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            <FiUsers />
            {filteredCount} rule{filteredCount !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>
    </div>
  )
}

export default RulesFilterBar
