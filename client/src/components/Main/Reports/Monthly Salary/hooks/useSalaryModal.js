import { useState, useCallback } from 'react';

export const useSalaryModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const openModal = useCallback((employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  }, []);

  const updateSelectedEmployee = useCallback((employee) => {
    setSelectedEmployee(prev => prev && (prev.empId || prev.id) === (employee.empId || employee.id) ? employee : prev);
  }, []);

  return {
    isModalOpen,
    selectedEmployee,
    openModal,
    closeModal,
    updateSelectedEmployee
  };
};
