import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Calendar,
  User,
  Clock,
  IndianRupee ,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

const DailySalary = () => {
  // State for filters
  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0], // Today
    toDate: new Date().toISOString().split('T')[0],   // Today
    employeeId: ''
  });
  
  // State for employees dropdown
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // State for salary data
  const [dailySalaryData, setDailySalaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalPayable: 0,
    totalOvertime: 0,
    totalEmployees: 0,
    totalWorkingHours: 0
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Fetch employees for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const response = await axios.get(`${API_URL}/api/employees`);
      
      if (response.data.success) {
        setEmployees(response.data.data || []);
      } else {
        toast.error('Failed to load employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Mock employees for demonstration
      setEmployees([
        { _id: '1', empId: 'EMP1001', name: 'CHAMAN LAL BHATIA', department: 'Production' },
        { _id: '2', empId: 'EMP1002', name: 'RAJESH KUMAR', department: 'Quality Control' },
        { _id: '3', empId: 'EMP1003', name: 'PRIYA SHARMA', department: 'Packaging' },
        { _id: '4', empId: 'EMP1004', name: 'AMIT VERMA', department: 'Dispatch' },
        { _id: '5', empId: 'EMP1005', name: 'NEHA SINGH', department: 'Production' }
      ]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);
  
  // Generate mock daily salary data
  const generateMockDailyData = () => {
    const mockData = [];
    const departments = ['Production', 'Quality Control', 'Packaging', 'Dispatch', 'Maintenance'];
    const salaryTypes = ['Monthly', 'Daily', 'Hourly'];
    const groups = ['A', 'B', 'C', 'D'];
    
    for (let i = 1; i <= 25; i++) {
      const salaryPerHr = Math.floor(Math.random() * 300) + 150;
      const presentDays = Math.floor(Math.random() * 8) + 1;
      const workingHrs = presentDays * 8;
      const overtimeHrs = Math.floor(Math.random() * 4);
      const overtimePayable = overtimeHrs * (salaryPerHr * 1.5);
      const totalWorkingHrs = workingHrs + overtimeHrs;
      const payableAmount = (workingHrs * salaryPerHr) + overtimePayable;
      
      mockData.push({
        id: i,
        empId: `EMP${1000 + i}`,
        empName: `Employee ${i}`,
        department: departments[Math.floor(Math.random() * departments.length)],
        subDepartment: ['Line 1', 'Line 2', 'Section A', 'Section B'][Math.floor(Math.random() * 4)],
        group: groups[Math.floor(Math.random() * groups.length)],
        salaryType: salaryTypes[Math.floor(Math.random() * salaryTypes.length)],
        salaryPerHr: salaryPerHr,
        present: presentDays,
        workingHrs: workingHrs,
        overtimeHrs: overtimeHrs,
        overtimePayable: overtimePayable,
        totalWorkingHrs: totalWorkingHrs,
        inOutTime: ['08:00-17:00', '09:00-18:00', '07:00-16:00', '10:00-19:00'][Math.floor(Math.random() * 4)],
        payableAmount: payableAmount,
        date: new Date().toISOString().split('T')[0]
      });
    }
    
    // Calculate summary
    const totalPayable = mockData.reduce((sum, item) => sum + item.payableAmount, 0);
    const totalOvertime = mockData.reduce((sum, item) => sum + item.overtimePayable, 0);
    const totalWorkingHours = mockData.reduce((sum, item) => sum + item.totalWorkingHrs, 0);
    
    setSummary({
      totalPayable,
      totalOvertime,
      totalEmployees: mockData.length,
      totalWorkingHours
    });
    
    return mockData;
  };
  
  // Fetch daily salary data
  const fetchDailySalaryData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        employeeId: filters.employeeId,
        page: currentPage,
        limit: pageSize
      };
      
      const response = await axios.get(`${API_URL}/api/salary/daily-report`, { params });
      
      if (response.data.success) {
        const reports = response.data.data.reports || [];
        const mapped = reports.map(r => {
          const emp = r.employee || {};
          return {
            empId: emp.empId || (emp._id || '').toString().slice(-6),
            empName: emp.name || '',
            department: emp.headDepartment?.name || '',
            subDepartment: emp.subDepartment?.name || emp.subDepartment || '',
            group: emp.group || '',
            salaryType: emp.salary ? 'Monthly' : 'Daily',
            salaryPerHr: emp.salary ? Math.round((emp.salary / (30 * (emp.shiftHours || 8)))) : 0,
            present: null,
            workingHrs: r.totalWorkingHours || 0,
            overtimeHrs: null,
            overtimePayable: r.otTotal || 0,
            totalWorkingHrs: r.totalWorkingHours || 0,
            inOutTime: '',
            payableAmount: r.payable || r.payable === 0 ? r.payable : r.payableAmount || 0,
            date: `${filters.fromDate} to ${filters.toDate}`
          }
        })
        setDailySalaryData(mapped);
        setTotalRecords(response.data.data.total || 0);
        setSummary(response.data.data.summary || {
          totalPayable: 0,
          totalOvertime: 0,
          totalEmployees: 0,
          totalWorkingHours: 0
        });
      } else {
        toast.error(response.data.message || 'Failed to fetch daily salary data');
        // Use mock data for demonstration
        const mockData = generateMockDailyData();
        setDailySalaryData(mockData.slice(0, pageSize));
        setTotalRecords(mockData.length);
      }
    } catch (error) {
      console.error('Error fetching daily salary data:', error);
      // Use mock data for demonstration
      const mockData = generateMockDailyData();
      setDailySalaryData(mockData.slice(0, pageSize));
      setTotalRecords(mockData.length);
      toast.error('Failed to load daily salary report');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Apply filters
  const applyFilters = (e) => {
    e?.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchDailySalaryData();
  };
  
  // Clear filters
  const clearFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setFilters({
      fromDate: today,
      toDate: today,
      employeeId: ''
    });
    setCurrentPage(1);
  };
  
  // Export to CSV/Excel
  const exportToExcel = () => {
    const fromDate = filters.fromDate || 'All';
    const toDate = filters.toDate || 'All';
    
    // Prepare data
    const ws_data = [
      [`Daily Salary Report - ${fromDate} to ${toDate}`],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],
      [
        'Emp ID', 'Emp Name', 'Department', 'Sub Department', 'Emp Group',
        'Salary Type', 'Salary/Hr', 'Present', 'Working Hrs', 'OT Hours',
        'OT Payable', 'Total Working Hrs', 'In-Out Time', 'Payable Amount', 'Date'
      ],
      ...dailySalaryData.map(item => [
        item.empId,
        item.empName,
        item.department,
        item.subDepartment,
        item.group,
        item.salaryType,
        item.salaryPerHr,
        item.present,
        item.workingHrs,
        item.overtimeHrs,
        item.overtimePayable,
        item.totalWorkingHrs,
        item.inOutTime,
        item.payableAmount,
        item.date
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Salary Report');
    
    // Merge header cells
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } });
    
    XLSX.writeFile(wb, `Daily_Salary_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Excel exported successfully');
  };
  
  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const fromDate = filters.fromDate || 'All';
    const toDate = filters.toDate || 'All';
    
    // Title
    doc.setFontSize(16);
    doc.text(`Daily Salary Report - ${fromDate} to ${toDate}`, 14, 15);
    
    // Date and filters
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Total Employees: ${summary.totalEmployees}`, 14, 29);
    doc.text(`Total Payable: ₹${summary.totalPayable.toLocaleString()}`, 14, 36);
    
    // Table headers
    const headers = [
      ['Emp ID', 'Emp Name', 'Dept', 'Group', 'Present', 'OT Hrs', 'Total Hrs', 'Payable']
    ];
    
    // Table data
    const data = dailySalaryData.map(item => [
      item.empId,
      item.empName.substring(0, 15),
      item.department.substring(0, 10),
      item.group,
      item.present,
      item.overtimeHrs,
      item.totalWorkingHrs,
      `₹${item.payableAmount?.toLocaleString() || '0'}`
    ]);
    
    // Generate table
    doc.autoTable({
      head: headers,
      body: data,
      startY: 45,
      margin: { top: 45 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 51, 51], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    // Summary
    const finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(10);
    doc.text('Summary:', 14, finalY + 10);
    doc.text(`Total Payable: ₹${summary.totalPayable.toLocaleString()}`, 14, finalY + 16);
    doc.text(`Total Overtime: ₹${summary.totalOvertime.toLocaleString()}`, 14, finalY + 22);
    
    doc.save(`Daily_Salary_${fromDate}_to_${toDate}.pdf`);
    toast.success('PDF exported successfully');
  };
  
  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    const fromDate = filters.fromDate || 'All';
    const toDate = filters.toDate || 'All';
    
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Salary Report - ${fromDate} to ${toDate}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .summary { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { text-align: center; padding: 10px; background: white; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .summary-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .summary-label { color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background-color: #333; color: white; padding: 8px; text-align: left; }
          td { padding: 6px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .highlight-green { background-color: #d4edda !important; }
          .highlight-red { background-color: #f8d7da !important; }
          .highlight-blue { background-color: #cce5ff !important; }
          .highlight-yellow { background-color: #fff3cd !important; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          @media print {
            body { margin: 0; font-size: 11px; }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <h1>Daily Salary Report</h1>
        <div class="info">
          <p><strong>Period:</strong> ${fromDate} to ${toDate}</p>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">₹${summary.totalPayable.toLocaleString()}</div>
              <div class="summary-label">Total Payable</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">₹${summary.totalOvertime.toLocaleString()}</div>
              <div class="summary-label">Total Overtime</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${summary.totalEmployees}</div>
              <div class="summary-label">Total Employees</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${summary.totalWorkingHours}</div>
              <div class="summary-label">Total Working Hours</div>
            </div>
          </div>
        </div>
        
        ${document.getElementById('dailySalaryTable').outerHTML}
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
            Print Report
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
            Close Window
          </button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
  };
  
  // View time details
  const viewTimeDetails = (employee) => {
    toast.info(`Viewing time details for ${employee.empName}`);
    // Implement modal for time details
    console.log('Time details:', employee);
  };
  
  // Handle pagination
  const totalPages = Math.ceil(totalRecords / pageSize);
  
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const goPrev = () => goToPage(currentPage - 1);
  const goNext = () => goToPage(currentPage + 1);
  
  // Initialize
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  
  useEffect(() => {
    fetchDailySalaryData();
  }, [fetchDailySalaryData]);
  
  return (
    <div className="container-fluid px-4 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Salary Report</h1>
            <p className="text-gray-600 mt-1">Daily salary calculations and attendance summary</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Daily Report
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Payable</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{summary.totalPayable.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <IndianRupee  className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Overtime</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{summary.totalOvertime.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Clock className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalEmployees}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <User className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Total Working Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalWorkingHours}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <TrendingUp className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Row */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
        <form onSubmit={applyFilters}>
          <div className="grid grid-cols-1 md:grid-cols-13 gap-4 items-end">
            {/* From Date */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  name="fromDate"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.fromDate}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            
            {/* To Date */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  name="toDate"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.toDate}
                  onChange={handleFilterChange}
                  min={filters.fromDate}
                />
              </div>
            </div>
            
            {/* Employee Select */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                name="employeeId"
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.employeeId}
                onChange={handleFilterChange}
                disabled={loadingEmployees}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.empId} - {emp.name}
                  </option>
                ))}
              </select>
              {loadingEmployees && (
                <p className="text-xs text-gray-500 mt-1">Loading employees...</p>
              )}
            </div>
            
            {/* Filter Button */}
            <div className="md:col-span-1">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
                title="Apply Filters"
              >
                <Filter size={18} />
                {/* <span className="hidden sm:inline">Filter</span> */}
              </button>
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition duration-200"
                title="Clear Filters"
              >
                <RefreshCw size={18} />
                {/* <span className="hidden sm:inline">Clear</span> */}
              </button>
            </div>
            
            {/* Export Buttons */}
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={exportToExcel}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
                title="Export to Excel"
              >
                <Download size={18} />
                {/* <span className="hidden sm:inline">Excel</span> */}
              </button>
            </div>
            
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={printReport}
                className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
                title="Print Report"
              >
                <Printer size={18} />
                {/* <span className="hidden sm:inline">Print</span> */}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Daily Salary Report Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading daily salary report...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" id="dailySalaryTable">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Emp. ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Emp. Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Department
                    </th>                  
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50 text-blue-900 border whitespace-nowrap">
                      Sub Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Salary Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Salary/Hr
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Present
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Working Hrs
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-red-50 text-red-900 border whitespace-nowrap">
                      Over Time (OT)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-green-50 text-green-900 border whitespace-nowrap">
                      OT (Payable)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      Total Hrs
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      In-Out Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-green-50 text-green-900 border whitespace-nowrap">
                      Payable Amt (INR)
                    </th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-gray-200">
                  {dailySalaryData.length > 0 ? (
                    dailySalaryData.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.empId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <User size={14} className="text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.empName}</div>
                              <div className="text-xs text-gray-500">{item.date}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {item.department}
                          </span>
                        </td>
                        {/* <td className="px-4 py-3 text-sm text-gray-900">
                          
                        </td> */}
                        <td className="px-4 py-3 text-sm font-medium bg-blue-50 border">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.subDepartment}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            item.salaryType === 'Hourly' ? 'bg-yellow-100 text-yellow-800' :
                            item.salaryType === 'Daily' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {item.salaryType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ₹{item.salaryPerHr?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            item.present > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.present}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">
                          {item.workingHrs}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-medium bg-red-50 border">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {item.overtimeHrs} hrs
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-700 bg-green-50 border">
                          ₹{item.overtimePayable?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">
                          {item.totalWorkingHrs}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => viewTimeDetails(item)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition"
                            title="View Time Details"
                          >
                            {item.inOutTime}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-700 bg-green-50 border">
                          <div className="flex items-center justify-between">
                            <span>₹{item.payableAmount?.toLocaleString() || '0'}</span>
                            <button
                              onClick={() => exportToPDF()}
                              className="text-green-600 hover:text-green-800"
                              title="Download PDF"
                            >
                              <FileText size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="14" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Clock size={48} className="mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">No daily salary records found</p>
                          <p className="text-sm">Try changing your date range or filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {dailySalaryData.length > 0 && (
              <div className="border-t px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Rows:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={goPrev}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="px-2 text-gray-500">...</span>
                          <button
                            onClick={() => goToPage(totalPages)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    
                    <button
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={goNext}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Date Range Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Date Range:</span> {filters.fromDate} to {filters.toDate}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Showing data for {dailySalaryData.length} employees
            </p>
          </div>
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setFilters(prev => ({ ...prev, fromDate: today, toDate: today }));
              setCurrentPage(1);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Calendar size={14} />
            Set to Today
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailySalary;