import { useState } from 'react';
import { FileDown, RotateCcw, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];


const AttendanceFilter = ({ filters, setFilters, onSearch, reportData, isMobile }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const getYearOptions = (startYear = 2023) => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y)
    }
    return years
  }

  const handleClearFilter = () => {
    setFilters({ month: '', year: '' });
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const emp = reportData.employee;
    const days = reportData.days || [];
    const data = reportData.table || {};

    const ws_data = [
      [`Attendance Report - ${emp?.name || 'Employee'}`, '', '', '', '', ''],
      [`Employee ID: ${emp?.empId}`, `Department: ${emp?.headDepartment}`, `Sub Dept: ${emp?.subDepartment}`, '', '', ''],
      [''],
      ['Day', ...days.map(d => `${d.date}\n${d.day}`)],
      ...Object.keys(data).map(row => [row, ...data[row]])
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Attendance_${emp?.name}_${emp?.empId}_${new Date().getTime()}.xlsx`);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    if (!reportData) return

    const emp = reportData.employee
    const days = reportData.days || []
    const data = reportData.table || {}

    const doc = new jsPDF('l', 'mm', 'a4')

    doc.setFontSize(16)
    doc.text(`Attendance Report - ${emp?.name || 'Employee'}`, 14, 15)

    doc.setFontSize(10)
    doc.text(`Employee ID: ${emp?.empId}`, 14, 22)
    doc.text(`Department: ${emp?.headDepartment}`, 14, 27)

    const tableHead = [['Day', ...days.map(d => `${d.date} ${d.day}`)]]
    const tableBody = Object.keys(data).map(row => [row, ...data[row]])

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [51, 51, 51], textColor: 255 }
    })

    doc.save(`Attendance_${emp?.name}_${emp?.empId}_${Date.now()}.pdf`)
    setShowExportMenu(false)
  }

  if (isMobile) {
    return (
      <div className="bg-white rounded-xl shadow p-3 mb-4">
        {/* Mobile Filter Row */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="border p-2 rounded-lg focus:outline-none focus:border-gray-900 text-sm"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            >
              <option value="">Month</option>
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              className="border p-2 rounded-lg focus:outline-none focus:border-gray-900 text-sm"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            >
              <option value="">Year</option>
              {getYearOptions().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSearch}
              className="bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-800 font-medium text-sm flex items-center justify-center gap-1"
            >
              <Search size={14} /> Search
            </button>

            <button
              onClick={handleClearFilter}
              className="bg-gray-400 text-white rounded-lg px-3 py-2 hover:bg-gray-500 font-medium text-sm flex items-center justify-center gap-1"
            >
              <RotateCcw size={14} /> Clear
            </button>
          </div>

          {/* Export Button for Mobile */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!reportData}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 hover:bg-gray-700 disabled:bg-gray-300 font-medium text-sm flex items-center justify-center gap-1"
            >
              <FileDown size={14} /> Export
            </button>

            {showExportMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50">
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Export as Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-2 border-t"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet View
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow p-4 mb-6 overflow-x-auto border border-blue-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3 min-w-max lg:min-w-full">
        <select
          className="col-span-2 border p-2 rounded-lg focus:outline-none focus:border-gray-900 text-sm lg:text-base"
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
        >
          <option value="">Select Month</option>
          {months.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          className="col-span-2 border p-2 rounded-lg focus:outline-none focus:border-gray-900 text-sm lg:text-base"
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
        >
          <option value="">Select Year</option>
          {getYearOptions().map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <button
          onClick={onSearch}
          className="bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium text-sm lg:text-base"
        >
          Search
        </button>

        <button
          onClick={handleClearFilter}
          className="bg-gray-400 text-white rounded-lg px-4 py-2 hover:bg-gray-500 font-medium text-sm lg:text-base flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} /> Clear
        </button>

        <button
          onClick={handleExportExcel}
          disabled={!reportData}
          className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 disabled:bg-gray-300 font-medium text-sm lg:text-base flex items-center justify-center gap-2"
        >
          <FileDown size={16} /> Excel
        </button>

        <button
          onClick={handleExportPDF}
          disabled={!reportData}
          className="bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:bg-gray-300 font-medium text-sm lg:text-base flex items-center justify-center gap-2"
        >
          <FileDown size={16} /> PDF
        </button>
      </div>
    </div>
  )
}

export default AttendanceFilter