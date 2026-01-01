import { useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export const useLoanRecalculation = (setSalaryData, selectedMonth) => {
  const debounceTimers = useRef({});

  const recalculateSalaryOnServer = useCallback(async (employee, newLoanDeduct) => {
    try {
      // Call API to recalculate salary with new loan deduction
      const response = await axios.patch(
        `${API_URL}/api/salary/monthly/${employee.empId}/recalculate`,
        {
          loanDeduct: newLoanDeduct,
          month: selectedMonth
        }
      );

      if (response.data?.success) {
        const updatedSalary = response.data.data;
        
        // Update local state with recalculated values
        setSalaryData((prev) =>
          prev.map((item) =>
            (item.empId || item.id) === (employee.empId || employee.id)
              ? {
                  ...item,
                  loanDeduct: updatedSalary.loanDeduct,
                  totalDeductions: updatedSalary.totalDeductions,
                  netPay: updatedSalary.netPay
                }
              : item
          )
        );

        return updatedSalary;
      } else {
        toast.error(response.data?.message || 'Failed to recalculate salary');
        return null;
      }
    } catch (error) {
      console.error('Error recalculating salary:', error);
      toast.error('Failed to recalculate salary. Please try again.');
      return null;
    }
  }, [setSalaryData, selectedMonth]);

  const handleLoanDeductChange = useCallback((employee, newValue) => {
    const employeeId = employee.empId || employee.id;

    // Update UI immediately for better UX
    setSalaryData((prev) =>
      prev.map((item) =>
        (item.empId || item.id) === employeeId
          ? { ...item, loanDeduct: newValue }
          : item
      )
    );

    // Clear existing debounce timer for this employee
    if (debounceTimers.current[employeeId]) {
      clearTimeout(debounceTimers.current[employeeId]);
    }

    // Set new debounce timer (500ms delay after user stops typing)
    debounceTimers.current[employeeId] = setTimeout(() => {
      recalculateSalaryOnServer(employee, newValue);
      delete debounceTimers.current[employeeId];
    }, 500);
  }, [setSalaryData, recalculateSalaryOnServer]);

  // Cleanup function to clear all timers
  const cleanup = useCallback(() => {
    Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    debounceTimers.current = {};
  }, []);

  return {
    handleLoanDeductChange,
    recalculateSalaryOnServer,
    cleanup
  };
};
