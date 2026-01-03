import React, { memo } from 'react';
import { Calendar } from 'lucide-react';
import SalaryTableRow from './SalaryTableRow';

const SalaryTable = memo(({ 
  salaryData, 
  loading, 
  dataExists, 
  monthYear,
  onViewDetails,
  onPay,
  onDownloadPDF,
  onLoanDeductChange
}) => {
  if (!dataExists && !loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Monthly Salary Report - {monthYear}</h2>
        </div>
        <div className="py-12 text-center">
          <p className="text-gray-600 text-lg">No salary data available for the selected month.</p>
          <p className="text-gray-500 text-sm mt-2">Please select a different month or click "Apply Filters" to check.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Monthly Salary Report - {monthYear}</h2>
        </div>
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading salary report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-4 py-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold">Monthly Salary Report - {monthYear}</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full" id="salaryTable">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Emp. ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Emp. Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sub Dept.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary/ Month</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary/ Day</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary/ Hour</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Present Days</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100">Basic Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50">Basic Pay</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100">OT Hours</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50">OT Pay</th>
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
                  item={item}
                  onView={onViewDetails}
                  onPay={onPay}
                  onDownloadPDF={onDownloadPDF}
                  onLoanDeductChange={onLoanDeductChange}
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
