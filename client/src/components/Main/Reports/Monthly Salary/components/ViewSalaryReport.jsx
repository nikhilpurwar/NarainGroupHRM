import React, { memo, useEffect, useState } from 'react';
import { X, FileText, BanknoteArrowUp, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';

const ViewSalaryReport = memo(({ isOpen, onClose, employee, monthYear, onPay, onDownloadPDF }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (employee) {
      setNote(employee.note || '');
    } else {
      setNote('');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handlePay = () => {
    onPay(employee, note);
  };

  const handleDownloadPDF = () => {
    onDownloadPDF(employee);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh]">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-blue-800 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold">Salary Slip</h2>
            <p className="text-blue-100 text-sm mt-1">{monthYear}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] main-scroll">
          {/* Employee Info Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-6 border border-blue-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {employee.empName?.charAt(0) || 'E'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{employee.empName}</h3>
                <p className="text-sm text-gray-600">Employee ID: <span className="font-semibold">{employee.empId}</span></p>
                <p className="text-sm text-gray-600">Department: <span className="font-semibold">{employee.department || 'N/A'}</span></p>
                <p className="text-sm text-gray-600">Sub Department: <span className="font-semibold">{employee.group || 'N/A'}</span></p>
              </div>
              {employee.status && <div className={`px-4 py-2 rounded-full font-semibold ${employee.status === 'Paid' ? 'bg-green-100 text-green-800 border border-green-600' : 'bg-yellow-100 text-yellow-800 border border-yellow-600'}`}>
                {employee.status}
              </div>}
            </div>
          </div>

          {/* Salary Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Basic Salary Info */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3 pb-2 border-b">Basic Salary Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Salary:</span>
                  <span className="font-semibold">₹{employee.salary?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salary Per Day:</span>
                  <span className="font-semibold">₹{employee.salaryPerDay?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salary Per Hour:</span>
                  <span className="font-semibold">₹{employee.salaryPerHour?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Present Days:</span>
                  <span className={`font-semibold ${employee.presentDays >= 22 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {employee.presentDays}
                  </span>
                </div>
              </div>
            </div>

            {/* Hours & Pay */}
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3 pb-2 border-b">Hours & Pay Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Hours:</span>
                  <span className="font-semibold">{employee.basicHours || '0'} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Pay:</span>
                  <span className="font-semibold text-blue-600">₹{employee.basicPay?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">OT Hours:</span>
                  <span className="font-semibold">{employee.otHours || '0'} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">OT Pay:</span>
                  <span className="font-semibold text-blue-600">₹{employee.otPay?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-700 font-medium">Total Hours:</span>
                  <span className="font-bold">{employee.totalHours || '0'} hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Pay Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Pay (Gross):</span>
              <span className="text-2xl font-bold text-green-700">₹{employee.totalPay?.toLocaleString() || '0'}</span>
            </div>
          </div>

          {/* Deductions Section */}
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-700 mb-3 pb-2 border-b">Deductions</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex justify-between">
                <span className="text-gray-600">TDS:</span>
                <span className="font-semibold">₹{employee.tds?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">P.Tax:</span>
                <span className="font-semibold">₹{employee.pTax?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">LWF:</span>
                <span className="font-semibold">₹{employee.lwf?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ESI:</span>
                <span className="font-semibold">₹{employee.esi?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Basic PF:</span>
                <span className="font-semibold">₹{employee.basicPF?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">OT PF:</span>
                <span className="font-semibold">₹{employee.otPF?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Insurance:</span>
                <span className="font-semibold">₹{employee.insurance?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Advance:</span>
                <span className="font-semibold">₹{employee.advance?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Deduct:</span>
                <span className="font-semibold">₹{employee.loanDeduct?.toLocaleString() || '0'}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200">
              <span className="text-lg font-semibold text-gray-700">Total Deductions:</span>
              <span className="text-xl font-bold text-yellow-700">₹{employee.totalDeductions?.toLocaleString() || '0'}</span>
            </div>
          </div>

          {/* Loan Information */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-700 mb-3 pb-2 border-b">Loan Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Pending:</span>
                <span className="font-semibold">₹{employee.loanPending?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Received:</span>
                <span className="font-semibold">₹{employee.loanReceived?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Deducted:</span>
                <span className="font-semibold text-red-600">₹{employee.loanDeduct?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Section */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-800">Net Pay (Take Home):</span>
              <span className="text-3xl font-bold text-blue-700">₹{employee.netPay?.toLocaleString() || '0'}</span>
            </div>
          </div>

          {/* Note (optional) */}
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              className="w-full min-h-[80px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder="Add any note for this payment (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Footer - Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-between items-center gap-3 rounded-b-xl border-t">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition cursor-pointer"
          >
            Close
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition cursor-pointer"
              title="Download PDF"
            >
              <Download size={18} />
              Download PDF
            </button>
            <button
              onClick={handlePay}
              disabled={employee.status === 'Paid'}
              className={`flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition ${
                employee.status === 'Paid'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
              }`}
              title={employee.status === 'Paid' ? 'Already Paid' : 'Mark as Paid'}
            >
              <BanknoteArrowUp size={18} />
              {employee.status === 'Paid' ? 'Paid' : 'Mark as Paid'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ViewSalaryReport.displayName = 'ViewSalaryReport';

export default ViewSalaryReport;
