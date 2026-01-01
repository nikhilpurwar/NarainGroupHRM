import { useCallback, useMemo } from 'react';

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

export const useDateHelper = (selectedMonth = null) => {
  const monthYearOptions = useMemo(() => {
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
  }, []);

  const getSelectedMonthYearLabel = useCallback((monthStr = selectedMonth) => {
    if (!monthStr) return 'Current Month';
    const [y, m] = String(monthStr).split('-');
    const monthObj = months.find(ms => String(ms.value) === String(m));
    return `${y} | ${monthObj ? monthObj.label : `Month ${m}`}`;
  }, [selectedMonth]);

  return {
    months,
    years,
    monthYearOptions,
    getSelectedMonthYearLabel
  };
};
