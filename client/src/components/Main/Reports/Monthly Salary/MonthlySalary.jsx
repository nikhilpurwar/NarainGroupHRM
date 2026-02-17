import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { IndianRupee } from 'lucide-react';
import { toast } from 'react-toastify';
import { payMonthly, recalculateMonthly } from '../../../../services/ApiService';
import {
  useSalaryFilters,
  useSalaryData,
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
import ViewSalaryReport from './components/ViewSalaryReport';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

// Memoized Summary Stats Component
const SalarySummaryStats = memo(({ salaryData, summary, totalRecords }) => {
  const hasBackendSummary = !!summary;

  const totalPayroll = hasBackendSummary
    ? (summary.totalPayable || 0)
    : salaryData.reduce((sum, item) => sum + (item.totalPay || 0), 0);

  const totalDeductions = hasBackendSummary
    ? (summary.totalDeductions || 0)
    : salaryData.reduce((sum, item) => sum + (item.totalDeductions || 0), 0);

  const totalNetPay = hasBackendSummary
    ? (summary.totalNetPay || 0)
    : salaryData.reduce((sum, item) => sum + (item.netPay || 0), 0);

  const avgBaseCount = hasBackendSummary ? (totalRecords || 0) : salaryData.length;
  const averageSalary = avgBaseCount > 0
    ? Math.round(totalNetPay / avgBaseCount)
    : 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="card-hover bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Payroll</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalPayroll.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <IndianRupee className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      <div className="card-hover bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Deductions</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalDeductions.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg">
            <IndianRupee className="text-yellow-600" size={24} />
          </div>
        </div>
      </div>

      <div className="card-hover bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Net Payable</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalNetPay.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <IndianRupee className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      <div className="card-hover bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Average Salary</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{averageSalary.toLocaleString()}
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
  const { months, years, getSelectedMonthYearLabel } = useDateHelper(filters.month, filters.year);
  const [recalculating, setRecalculating] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { salaryData, setSalaryData, loading, dataExists, checkedMonth, totalRecords, summary, checkDataExists, fetchSalaryData } = useSalaryData(filters, currentPage, pageSize);
  const totalPages = Math.ceil(totalRecords / pageSize) || 0;
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  const goPrev = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const goNext = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);
  const resetPage = useCallback(() => setCurrentPage(1), []);
  const { isModalOpen, selectedEmployee, openModal, closeModal, updateSelectedEmployee } = useSalaryModal();
  const { exportToExcel, printReport } = useSalaryExport(getSelectedMonthYearLabel);
  const { downloadEmployeePDF } = useSalaryPDF(getSelectedMonthYearLabel);
  const { handleLoanDeductChange, cleanup } = useLoanRecalculation(setSalaryData, filters.month);
  const [pendingPayIds, setPendingPayIds] = useState([]);

  // Re-fetch data when pagination or page size changes
  useEffect(() => {
    if (dataExists) {
      fetchSalaryData();
    }
  }, [currentPage, pageSize, dataExists, fetchSalaryData]);

  // Check data exists on month change
  useEffect(() => {
    const selectedKey = `${filters.year}-${filters.month}`;
    if (checkedMonth !== selectedKey) {
      checkDataExists();
      resetPage();
      setSalaryData([]);
    }
  }, [filters.month, filters.year, checkedMonth, checkDataExists, resetPage, setSalaryData]);

  // Cleanup on unmount - clear any pending debounce timers
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Apply filters
  const handleApplyFilters = useCallback((e) => {
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
  }, [resetPage, checkDataExists, fetchSalaryData, setSalaryData]);

  // Clear filters
  const handleClearFilters = () => {
    clearFilters();
    resetPage();
    setSalaryData([]);
  };

  // Handle Pay - Mark salary as paid
  const handlePay = useCallback(async (employee, note) => {
    if (!filters.month || !filters.year) {
      toast.error('Please select month and year before marking salary as paid');
      return;
    }

    const empId = employee.empId || employee.id;

    if (pendingPayIds.includes(empId)) return; // already processing

    try {
      setPendingPayIds(prev => [...prev, empId]);
      const payload = {
        month: `${filters.year}-${filters.month}`,
        note: note || '',
        status: 'Paid'
      };

      const response = await payMonthly(empId, payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to update salary status');
      }

      const updatedStatus = response.data.data?.status || 'Paid';
      const updatedNote = response.data.data?.note || note || '';

      setSalaryData((prev) =>
        prev.map((item) =>
          (item.empId || item.id) === empId
            ? { ...item, status: updatedStatus, note: updatedNote }
            : item
        )
      );

      updateSelectedEmployee({ ...employee, status: updatedStatus, note: updatedNote });
      toast.success(`Salary marked as paid for ${employee.empName}`);
    } catch (error) {
      console.error('Error marking salary as paid:', error);
      toast.error(error.response?.data?.message || 'Failed to update payment status');
    } finally {
      setPendingPayIds(prev => prev.filter(id => id !== empId));
    }
  }, [filters.month, filters.year, setSalaryData, updateSelectedEmployee, pendingPayIds]);

  // Trigger backend monthly salary calculation and refresh data
  const handleRecalculate = useCallback(async () => {
    if (!filters.month || !filters.year) {
      toast.error('Please select month and year before recalculating');
      return;
    }
    setRecalculating(true);
    try {
      const payload = { month: `${filters.year}-${filters.month}` };
      const res = await recalculateMonthly(payload);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to recalculate salary');
      }
      toast.success('Monthly salary recalculated successfully');
      // Refresh data
      checkDataExists().then(exists => {
        if (exists) {
          fetchSalaryData();
        } else {
          setSalaryData([]);
        }
      });
    } catch (error) {
      console.error('Error recalculating monthly salary:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to recalculate salary');
    } finally {
      setRecalculating(false);
    }
  }, [filters.month, filters.year, checkDataExists, fetchSalaryData, setSalaryData]);

  // Handle export
  const handleExportExcel = useCallback(() => {
    exportToExcel(salaryData, filters);
  }, [exportToExcel, salaryData, filters]);

  const handlePrintReport = useCallback(() => {
    printReport(salaryData, filters, totalRecords);
  }, [printReport, salaryData, filters, totalRecords]);

  // Handle download employee PDF
  const handleDownloadEmployeePDF = useCallback((employee) => {
    downloadEmployeePDF(employee);
  }, [downloadEmployeePDF]);

  return (
    <div className="container-fluid px-4 py-6">
      {/* Summary Stats (use backend summary over all records when available) */}
      {(summary || salaryData.length > 0) && (
        <SalarySummaryStats
          salaryData={salaryData}
          summary={summary}
          totalRecords={totalRecords}
        />
      )}

      {/* Filters and Export Buttons */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-col md:flex-row">
        <div className="flex-1">
          <SalaryFilters
            filters={filters}
            months={months}
            years={years}
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
        isRecalculating={recalculating}
        monthYear={getSelectedMonthYearLabel()}
        currentPage={currentPage}
        pageSize={pageSize}
        onViewDetails={openModal}
        onPay={handlePay}
        onDownloadPDF={handleDownloadEmployeePDF}
        onLoanDeductChange={handleLoanDeductChange}
        onRecalculate={handleRecalculate}
        pendingPayIds={pendingPayIds}
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
        pendingPayIds={pendingPayIds}
      />
    </div>
  );
};

export default memo(MonthlySalary);
