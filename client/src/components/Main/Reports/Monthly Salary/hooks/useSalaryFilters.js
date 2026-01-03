import { useState, useCallback } from 'react';

export const useSalaryFilters = () => {
  const now = new Date();
  const defaultMonth = String(now.getMonth() + 1); // 1-12
  const defaultYear = String(now.getFullYear());
  
  const [filters, setFilters] = useState({
    employeeName: '',
    month: defaultMonth,
    year: defaultYear,
    subDepartment: ''
  });

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    const resetNow = new Date();
    setFilters({
      employeeName: '',
      month: String(resetNow.getMonth() + 1),
      year: String(resetNow.getFullYear()),
      subDepartment: ''
    });
  }, []);

  return {
    filters,
    setFilters,
    handleFilterChange,
    clearFilters
  };
};
