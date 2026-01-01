import { useState, useCallback } from 'react';

export const useSalaryFilters = () => {
  const currentMonthStr = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
  
  const [filters, setFilters] = useState({
    employeeName: '',
    month: currentMonthStr
  });

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      employeeName: '',
      month: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`
    });
  }, []);

  return {
    filters,
    setFilters,
    handleFilterChange,
    clearFilters
  };
};
