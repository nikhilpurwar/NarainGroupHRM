import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Printer, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Edit,
  Calendar,
  IndianRupee ,
  FileText
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

const MonthlySalary = () => {
  // State for filters
  const [filters, setFilters] = useState({
    employeeName: '',
    month: new Date().getMonth() + 1, // Current month
    year: new Date().getFullYear()
  });
  
  // State for salary data
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Months and years for dropdown
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  const years = [2025, 2024, 2023, 2022];
  
  // Generate month-year options for dropdown
  const getMonthYearOptions = () => {
    const options = [];
    years.forEach(year => {
      months.forEach(month => {
        options.push({
          value: `${year}-${month.value}`,
          label: `${year} | ${month.label}`
        });
      });
    });
    return options;
  };
  
  // Fetch salary data
  const fetchSalaryData = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = filters.month.split('-').map(Number);
      const params = {
        employeeName: filters.employeeName,
        month,
        year,
        page: currentPage,
        limit: pageSize
      };
      
      const response = await axios.get(`${API_URL}/api/salary/monthly-report`, { params });
      
      if (response.data.success) {
        setSalaryData(response.data.data.salaries || []);
        setTotalRecords(response.data.data.total || 0);
      } else {
        toast.error(response.data.message || 'Failed to fetch salary data');
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      toast.error('Failed to load salary report');
      // Mock data for demonstration
      setSalaryData(generateMockData());
      setTotalRecords(15);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize]);
  
  // Generate mock data for demonstration
  const generateMockData = () => {
    const mockData = [];
    for (let i = 1; i <= 15; i++) {
      const basicPay = Math.floor(Math.random() * 30000) + 20000;
      const otHours = Math.floor(Math.random() * 40);
      const otPay = otHours * 200;
      const totalPay = basicPay + otPay;
      const deductions = Math.floor(Math.random() * 5000);
      const netPay = totalPay - deductions;
      
      mockData.push({
        id: i,
        empId: `EMP${1000 + i}`,
        empName: `Employee ${i}`,
        salary: 30000 + i * 1000,
        group: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        salaryPerDay: Math.floor((30000 + i * 1000) / 30),
        presentDays: 22 + Math.floor(Math.random() * 6),
        basicHours: 176,
        basicPay,
        otHours,
        otPay,
        totalHours: 176 + otHours,
        totalPay,
        tds: Math.floor(Math.random() * 1000),
        pTax: Math.floor(Math.random() * 500),
        lwf: Math.floor(Math.random() * 300),
        esi: Math.floor(Math.random() * 800),
        basicPF: Math.floor(Math.random() * 1200),
        otPF: Math.floor(Math.random() * 600),
        insurance: Math.floor(Math.random() * 700),
        advance: Math.floor(Math.random() * 2000),
        loanPending: Math.floor(Math.random() * 5000),
        loanReceived: Math.floor(Math.random() * 3000),
        loanDeduct: Math.floor(Math.random() * 1500),
        totalDeductions: deductions,
        netPay,
        status: ['Paid', 'Pending', 'Processing'][Math.floor(Math.random() * 3)]
      });
    }
    return mockData;
  };
  
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
    fetchSalaryData();
  };
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      employeeName: '',
      month: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`
    });
    setCurrentPage(1);
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
  
  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const monthYear = filters.month ? getMonthYearOptions().find(opt => opt.value === filters.month)?.label : 'Current Month';
    
    // Title
    doc.setFontSize(18);
    doc.text(`Monthly Salary Report - ${monthYear}`, 14, 15);
    
    // Date and filters
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    if (filters.employeeName) {
      doc.text(`Filter: ${filters.employeeName}`, 14, 29);
    }
    
    // Table headers
    const headers = [
      ['Emp ID', 'Emp Name', 'Group', 'Basic Pay', 'OT Pay', 'Total Pay', 'Deductions', 'Net Pay', 'Status']
    ];
    
    // Table data
    const data = salaryData.map(item => [
      item.empId,
      item.empName,
      item.group,
      `₹${item.basicPay?.toLocaleString() || '0'}`,
      `₹${item.otPay?.toLocaleString() || '0'}`,
      `₹${item.totalPay?.toLocaleString() || '0'}`,
      `₹${item.totalDeductions?.toLocaleString() || '0'}`,
      `₹${item.netPay?.toLocaleString() || '0'}`,
      item.status
    ]);
    
    // Generate table
    doc.autoTable({
      head: headers,
      body: data,
      startY: 40,
      margin: { top: 40 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 51, 51], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY || 40;
    doc.setFontSize(10);
    doc.text(`Total Records: ${totalRecords}`, 14, finalY + 10);
    
    doc.save(`Salary_Report_${monthYear.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF exported successfully');
  };
  
  // Export to Excel
  const exportToExcel = () => {
    const monthYear = filters.month ? getMonthYearOptions().find(opt => opt.value === filters.month)?.label : 'Current Month';
    
    // Prepare data
    const ws_data = [
      [`Monthly Salary Report - ${monthYear}`],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      filters.employeeName ? [`Filter: ${filters.employeeName}`] : [],
      [],
      [
        'Emp ID', 'Emp Name', 'Group', 'Basic Salary', 'Salary/Day',
        'Present Days', 'Basic Hours', 'Basic Pay', 'OT Hours', 'OT Pay',
        'Total Hours', 'Total Pay', 'TDS', 'P.Tax', 'LWF', 'ESI',
        'Basic PF', 'OT PF', 'Insurance', 'Advance', 'Loan Pending',
        'Loan Received', 'Loan Deduct', 'Total Deductions', 'Net Pay', 'Status'
      ],
      ...salaryData.map(item => [
        item.empId,
        item.empName,
        item.group,
        item.salary,
        item.salaryPerDay,
        item.presentDays,
        item.basicHours,
        item.basicPay,
        item.otHours,
        item.otPay,
        item.totalHours,
        item.totalPay,
        item.tds,
        item.pTax,
        item.lwf,
        item.esi,
        item.basicPF,
        item.otPF,
        item.insurance,
        item.advance,
        item.loanPending,
        item.loanReceived,
        item.loanDeduct,
        item.totalDeductions,
        item.netPay,
        item.status
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Report');
    
    // Merge header cells
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 25 } });
    
    XLSX.writeFile(wb, `Salary_Report_${monthYear.replace(/\s+/g, '_')}.xlsx`);
    toast.success('Excel exported successfully');
  };
  
  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    const monthYear = filters.month ? getMonthYearOptions().find(opt => opt.value === filters.month)?.label : 'Current Month';
    
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Salary Report - ${monthYear}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info { margin-bottom: 20px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #333; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .total-row { font-weight: bold; background-color: #e8f4f8 !important; }
          .header-row { background-color: #f0f0f0 !important; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          @media print {
            body { margin: 0; }
            table { font-size: 12px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Monthly Salary Report - ${monthYear}</h1>
        <div class="info">
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          ${filters.employeeName ? `<p>Filter: ${filters.employeeName}</p>` : ''}
          <p>Total Records: ${totalRecords}</p>
        </div>
        ${document.getElementById('salaryTable').outerHTML}
        <div class="no-print" style="margin-top: 20px;">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
  };
  
  // View details
  const viewDetails = (employee) => {
    toast.info(`Viewing details for ${employee.empName}`);
    // Implement modal or navigate to detail page
    console.log('Employee details:', employee);
  };
  
  // Edit salary
  const editSalary = (employee) => {
    toast.info(`Editing salary for ${employee.empName}`);
    // Implement edit functionality
    console.log('Edit employee:', employee);
  };
  
  // Initialize
  useEffect(() => {
    const currentMonth = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    setFilters(prev => ({ ...prev, month: currentMonth }));
  }, []);
  
  // Fetch data when dependencies change
  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);
  
  return (
    <div className="container-fluid px-4 py-6">
      {/* Page Header */}
      {/* <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monthly Salary Report</h1>
            <p className="text-gray-600 mt-1">View and manage monthly salary calculations</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {totalRecords} Employees
            </span>
          </div>
        </div>
      </div> */}

      {/* Summary Stats */}
      {salaryData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{salaryData.reduce((sum, item) => sum + (item.totalPay || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <IndianRupee  className="text-green-600" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{salaryData.reduce((sum, item) => sum + (item.totalDeductions || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Payable</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{salaryData.reduce((sum, item) => sum + (item.netPay || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <IndianRupee  className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Salary</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{Math.round(salaryData.reduce((sum, item) => sum + (item.netPay || 0), 0) / salaryData.length).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <IndianRupee  className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filter Row */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <form onSubmit={applyFilters}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Employee Name Search */}
            <div className="md:col-span-3">
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
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            
            {/* Month-Year Select */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month & Year
              </label>
              <select
                name="month"
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.month}
                onChange={handleFilterChange}
              >
                <option value="">---- Select Month & Year ----</option>
                {getMonthYearOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Filter Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
              >
                <Filter size={18} />
                Apply Filters
              </button>
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition duration-200"
              >
                <span>Clear</span>
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="md:col-span-2 flex gap-2">
              <button
                type="button"
                onClick={printReport}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
                title="Print Report"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">Print</span>
              </button>
              
              <button
                type="button"
                onClick={exportToExcel}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
                title="Download Excel"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Excel</span>
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Salary Report Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading salary report...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" id="salaryTable">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Emp. ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Emp. Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Salary
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Emp. Group
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Salary/Day
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Present Days
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Basic Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Basic Pay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      OT Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      OT Pay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-green-50 text-green-900 border">
                      Total Pay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      TDS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      P.Tax
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      LWF
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ESI
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-100 text-gray-900">
                      Basic PF
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50 text-blue-900">
                      OT PF
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Insurance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Advance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Loan Pending
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Loan Received
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Loan Deduct
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-yellow-50 text-yellow-900 border">
                      Total Deductions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-blue-50 text-blue-900 border">
                      Net Pay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-gray-200">
                  {salaryData.length > 0 ? (
                    salaryData.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.empId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800">
                                {item.empName?.charAt(0) || 'E'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.empName}</div>
                              <div className="text-xs text-gray-500">{item.department || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.salary?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {item.group}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.salaryPerDay?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${item.presentDays >= 22 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {item.presentDays}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">
                          {item.basicHours}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ₹{item.basicPay?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">
                          {item.otHours}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ₹{item.otPay?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">
                          {item.totalHours}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-700 bg-green-50 border">
                          ₹{item.totalPay?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.tds?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.pTax?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.lwf?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.esi?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 bg-gray-50">
                          ₹{item.basicPF?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-700 bg-blue-50">
                          ₹{item.otPF?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.insurance?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.advance?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.loanPending?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.loanReceived?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ₹{item.loanDeduct?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-yellow-700 bg-yellow-50 border">
                          ₹{item.totalDeductions?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50 border">
                          ₹{item.netPay?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => viewDetails(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => editSalary(item)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Edit Salary"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => exportToPDF()}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Download PDF"
                            >
                              <FileText size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="27" className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Calendar size={48} className="mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">No salary records found</p>
                          <p className="text-sm">Try changing your filters or add salary data</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {salaryData.length > 0 && (
              <div className="border-t px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
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
                          <span className="px-2">...</span>
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
    </div>
  );
};

export default MonthlySalary;