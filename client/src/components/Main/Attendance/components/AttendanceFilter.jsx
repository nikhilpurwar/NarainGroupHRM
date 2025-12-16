import { FileDown, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

const AttendanceFilter = ({ filters, setFilters, onSearch, reportData }) => {
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
    XLSX.writeFile(wb, `Attendance_${emp?.empId}_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    
    const emp = reportData.employee;
    const days = reportData.days || [];
    const data = reportData.table || {};
    
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(`Attendance Report - ${emp?.name || 'Employee'}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Employee ID: ${emp?.empId}`, 14, 22);
    doc.text(`Department: ${emp?.headDepartment}`, 14, 27);
    
    const tableHead = [['Day', ...days.map(d => `${d.date} ${d.day}`)]];
    const tableBody = Object.keys(data).map(row => [row, ...data[row]]);
    
    doc.autoTable({
      head: tableHead,
      body: tableBody,
      startY: 35,
      margin: { top: 35 },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [51, 51, 51], textColor: 255 }
    });
    
    doc.save(`Attendance_${emp?.empId}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6 overflow-x-auto main-scroll">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 min-w-max lg:min-w-full">
        <select
          className="border p-2 rounded-lg focus:outline-none focus:border-gray-900"
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
        >
          <option value="">Select Month</option>
          {months.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded-lg focus:outline-none focus:border-gray-900"
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
        >
          <option value="">Select Year</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>

        <button
          onClick={onSearch}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800 font-medium"
        >
          Search
        </button>

        <button
          onClick={handleClearFilter}
          className="bg-gray-400 text-white rounded-lg px-4 py-2 hover:bg-gray-500 font-medium flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} /> Clear
        </button>

        <button
          onClick={handleExportExcel}
          disabled={!reportData}
          className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2"
        >
          <FileDown size={16} /> Excel
        </button>

        <button
          onClick={handleExportPDF}
          disabled={!reportData}
          className="bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2"
        >
          <FileDown size={16} /> PDF
        </button>
      </div>
    </div>
  )
}

export default AttendanceFilter
