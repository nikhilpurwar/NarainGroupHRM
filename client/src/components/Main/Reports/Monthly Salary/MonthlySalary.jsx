import React, { useState, useEffect, memo } from 'react';
import { IndianRupee } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useSalaryFilters,
  useSalaryData,
  usePagination,
  useSalaryModal,
  useDateHelper,
  useSalaryExport,
  useSalaryPDF,
  useLoanRecalculation
} from './hooks';
import {
  SalaryFilters,
  SalaryTable,
  SalaryPagination,
  SalaryExportButtons
} from './components';
import ViewSalaryReport from './ViewSalaryReport';

// Memoized Summary Stats Component
const SalarySummaryStats = memo(({ salaryData }) => {
  return (
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
            <IndianRupee className="text-green-600" size={24} />
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
            <IndianRupee className="text-yellow-600" size={24} />
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
            <IndianRupee className="text-blue-600" size={24} />
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
            <IndianRupee className="text-purple-600" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
});

SalarySummaryStats.displayName = 'SalarySummaryStats';

const MonthlySalary = () => {
  // Initialize hooks
  const { filters, handleFilterChange, clearFilters } = useSalaryFilters();
  const { monthYearOptions, getSelectedMonthYearLabel } = useDateHelper(filters.month);
  const [pageSize, setPageSize] = useState(10);
  const { salaryData, setSalaryData, loading, dataExists, checkedMonth, totalRecords, checkDataExists, fetchSalaryData } = useSalaryData(filters, 1, pageSize);
  const { currentPage, setCurrentPage, totalPages, goToPage, goPrev, goNext, resetPage } = usePagination(totalRecords, pageSize);
  const { isModalOpen, selectedEmployee, openModal, closeModal, updateSelectedEmployee } = useSalaryModal();
  const { exportToPDF, exportToExcel, printReport } = useSalaryExport(getSelectedMonthYearLabel);
  const { downloadEmployeePDF } = useSalaryPDF(getSelectedMonthYearLabel);
  const { handleLoanDeductChange, cleanup } = useLoanRecalculation(setSalaryData, filters.month);

  // Re-fetch data when pagination or page size changes
  useEffect(() => {
    if (dataExists) {
      fetchSalaryData();
    }
  }, [currentPage, pageSize, dataExists, fetchSalaryData]);

  // Check data exists on month change
  useEffect(() => {
    if (checkedMonth !== filters.month) {
      checkDataExists();
      resetPage();
      setSalaryData([]);
    }
  }, [filters.month, checkedMonth, checkDataExists, resetPage]);

  // Cleanup on unmount - clear any pending debounce timers
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Apply filters
  const handleApplyFilters = (e) => {
    e?.preventDefault();
    resetPage();
    checkDataExists().then(exists => {
      if (exists) {
        fetchSalaryData();
      } else {
        setSalaryData([]);
        toast.info('No salary data available for the selected month');
      }
    });
  };

  // Clear filters
  const handleClearFilters = () => {
    clearFilters();
    resetPage();
    setSalaryData([]);
  };

  // Handle Pay - Mark salary as paid
  const handlePay = (employee) => {
    try {
      setSalaryData((prev) =>
        prev.map((item) =>
          (item.empId || item.id) === (employee.empId || employee.id)
            ? { ...item, status: 'Paid' }
            : item
        )
      );
      updateSelectedEmployee({ ...employee, status: 'Paid' });
      toast.success(`Salary marked as paid for ${employee.empName}`);
    } catch (error) {
      console.error('Error marking salary as paid:', error);
      toast.error('Failed to update payment status');
    }
  };

  // Handle export
  const handleExportPDF = () => {
    exportToPDF(salaryData, filters, totalRecords);
  };

  const handleExportExcel = () => {
    exportToExcel(salaryData, filters);
  };

  const handlePrintReport = () => {
    printReport(salaryData, filters, totalRecords);
  };

  // Handle download employee PDF
  const handleDownloadEmployeePDF = (employee) => {
    downloadEmployeePDF(employee);
  };

  return (
    <div className="container-fluid px-4 py-6">
      {/* Summary Stats */}
      {salaryData.length > 0 && <SalarySummaryStats salaryData={salaryData} />}

      {/* Filters and Export Buttons */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-col md:flex-row">
        <div className="flex-1">
          <SalaryFilters
            filters={filters}
            monthYearOptions={monthYearOptions}
            onFilterChange={handleFilterChange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        </div>
        <div className="w-full md:w-auto flex items-center">
          <SalaryExportButtons
            onPrint={handlePrintReport}
            onExportExcel={handleExportExcel}
          />
        </div>
      </div>

      {/* Salary Table */}
      <SalaryTable
        salaryData={salaryData}
        loading={loading}
        dataExists={dataExists}
        monthYear={getSelectedMonthYearLabel()}
        onViewDetails={openModal}
        onPay={handlePay}
        onDownloadPDF={handleDownloadEmployeePDF}
        onLoanDeductChange={handleLoanDeductChange}
      />

      {/* Pagination */}
      {salaryData.length > 0 && (
        <SalaryPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            resetPage();
          }}
          onPrevPage={goPrev}
          onNextPage={goNext}
          onGoToPage={goToPage}
        />
      )}

      {/* Modal */}
      <ViewSalaryReport
        isOpen={isModalOpen}
        onClose={closeModal}
        employee={selectedEmployee}
        monthYear={getSelectedMonthYearLabel()}
        onPay={handlePay}
        onDownloadPDF={handleDownloadEmployeePDF}
      />
    </div>
  );
};

export default memo(MonthlySalary);
