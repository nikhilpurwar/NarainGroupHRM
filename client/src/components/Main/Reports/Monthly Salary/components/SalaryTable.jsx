import React, { memo } from 'react';
import { Calendar, ListRestart } from 'lucide-react';
import SalaryTableRow from './SalaryTableRow';
import { MdKeyboardBackspace, MdOutlineRefresh } from "react-icons/md"

const SalaryTable = memo(({
  salaryData,
  loading,
  dataExists,
  monthYear,
  currentPage,
  pageSize,
  onViewDetails,
  onPay,
  onDownloadPDF,
  onLoanDeductChange,
  onRecalculate,
  isRecalculating,
  pendingPayIds = []
}) => {

  // Show loader while fetching rows OR while checking whether data exists
  if (loading || dataExists === null) {
    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Monthly Salary Report - {monthYear}</h2>
        </div>
        <div className="py-6 px-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-4 gap-4">
              <div className="h-6 bg-gray-200 rounded col-span-1"></div>
              <div className="h-6 bg-gray-200 rounded col-span-1"></div>
              <div className="h-6 bg-gray-200 rounded col-span-1"></div>
              <div className="h-6 bg-gray-200 rounded col-span-1"></div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dataExists) {
    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Monthly Salary Report - {monthYear}</h2>
          <button
            type="button"
            title='Recalculate Monthly Salary'
            className={`button-hover ${isRecalculating ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={onRecalculate}
            disabled={isRecalculating}
          >
            <ListRestart className={`inline-block `} size={26} />
          </button>
        </div>
        <div className="py-12 text-center">
          <p className="text-gray-600 text-lg">No salary data available for the selected month.</p>
          <p className="text-gray-500 text-sm mt-2">Please select a different month or click "Apply Filters" to check.</p>
          <div className="mt-6 flex justify-center items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 shadow-xl hover:text-black hover:border-gray-900 cursor-pointer border-1 border-gray-300 px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <MdKeyboardBackspace size={24} />
              <span>Back</span>
            </button>
            <button
              onClick={onRecalculate}
              disabled={isRecalculating}
              className={`flex items-center px-4 py-2 bg-gray-800 shadow-xl border border-gray-300 rounded-md font-semibold text-white ${isRecalculating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-900'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <MdOutlineRefresh className={`mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold">Monthly Salary Report - {monthYear}</h2>
        <button
          title='Recalculate Monthly Salary'
          type="button"
          className={`${isRecalculating ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={onRecalculate}
          disabled={isRecalculating}
        >
          <ListRestart className={`inline-block `} size={26} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" id="salaryTable">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">S. No.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Emp. ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Emp. Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sub Dept.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary/ Month</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary/ Day</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary/ Hour</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Present Days</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100">Basic Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ">Auto Pay</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50 border">Basic Pay</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100">OT Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50 border">OT Pay</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-green-50 text-green-900 border">Total Pay</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">TDS</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">P.Tax</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">LWF</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ESI</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100 text-gray-900">Basic PF</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50 text-blue-900">OT PF</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Insurance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Advance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Loan Pending</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Loan Received</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Loan Deduct</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-yellow-50 text-yellow-900 border">Total Deductions</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50 text-blue-900 border">Net Pay</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {salaryData.length > 0 ? (
              salaryData.map((item, index) => (
                <SalaryTableRow
                  key={item.id || index}
                  serialNumber={((currentPage - 1) * pageSize) + index + 1}
                  item={item}
                  onView={onViewDetails}
                  onPay={onPay}
                  onDownloadPDF={onDownloadPDF}
                  onLoanDeductChange={onLoanDeductChange}
                  isPaying={pendingPayIds.includes(item.empId || item.id)}
                />
              ))
            ) : (
              <tr>
                <td colSpan="27" className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Calendar size={48} className="mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Data not found for {monthYear}</p>
                    <p className="text-sm">Try changing your filters or add salary data</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

});

SalaryTable.displayName = 'SalaryTable';

export default SalaryTable;
