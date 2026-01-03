import { useCallback } from 'react';

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

const years = [2027, 2026, 2025, 2024, 2023, 2022];

// Helper hook to work with separate month & year fields
export const useDateHelper = (selectedMonth = null, selectedYear = null) => {
  const getSelectedMonthYearLabel = useCallback(
    (month = selectedMonth, year = selectedYear) => {
      if (!month || !year) return 'Current Month';
      const monthObj = months.find(ms => String(ms.value) === String(month));
      return `${year} | ${monthObj ? monthObj.label : `Month ${month}`}`;
    },
    [selectedMonth, selectedYear]
  );

  return {
    months,
    years,
    getSelectedMonthYearLabel
  };
};
