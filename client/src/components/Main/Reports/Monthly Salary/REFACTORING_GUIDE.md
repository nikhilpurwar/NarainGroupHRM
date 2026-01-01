# MonthlySalary Component Refactoring Guide

## Overview
The `MonthlySalary.jsx` component has been refactored from a single large component (~1200 lines) into a modular architecture with custom hooks and reusable components.

## New Structure

```
Monthly Salary/
├── MonthlySalary.refactored.jsx    (Main orchestrator component)
├── ViewSalaryReport.jsx            (Modal - already existed)
├── hooks/
│   ├── index.js                    (Barrel export)
│   ├── useSalaryFilters.js         (Filter state management)
│   ├── useSalaryData.js            (Data fetching and state)
│   ├── usePagination.js            (Pagination logic)
│   ├── useSalaryModal.js           (Modal state management)
│   ├── useDateHelper.js            (Month/year utilities)
│   ├── useSalaryExport.js          (PDF/Excel/Print export)
│   └── useSalaryPDF.js             (Individual PDF generation)
└── components/
    ├── index.js                    (Barrel export)
    ├── SalaryFilters.jsx           (Filter UI component)
    ├── SalaryTable.jsx             (Main table component)
    ├── SalaryTableRow.jsx          (Individual row component)
    ├── SalaryPagination.jsx        (Pagination UI component)
    └── SalaryExportButtons.jsx     (Export buttons UI component)
```

## Custom Hooks

### `useSalaryFilters()`
Manages filter state (employee name, month)
- Returns: `filters`, `setFilters`, `handleFilterChange`, `clearFilters`

### `useSalaryData(filters, currentPage, pageSize)`
Manages salary data fetching and state
- Returns: `salaryData`, `setSalaryData`, `loading`, `dataExists`, `checkedMonth`, `totalRecords`, `checkDataExists`, `fetchSalaryData`

### `usePagination(totalRecords, pageSize)`
Handles pagination logic
- Returns: `currentPage`, `setCurrentPage`, `totalPages`, `goToPage`, `goPrev`, `goNext`, `resetPage`

### `useSalaryModal()`
Manages modal open/close state and selected employee
- Returns: `isModalOpen`, `selectedEmployee`, `openModal`, `closeModal`, `updateSelectedEmployee`

### `useDateHelper(selectedMonth)`
Provides month/year utilities and formatting
- Returns: `months`, `years`, `monthYearOptions`, `getSelectedMonthYearLabel`

### `useSalaryExport(getSelectedMonthYearLabel)`
Handles PDF, Excel, and print exports
- Returns: `exportToPDF`, `exportToExcel`, `printReport`

### `useSalaryPDF(getSelectedMonthYearLabel)`
Handles individual employee salary slip PDF generation
- Returns: `downloadEmployeePDF`

## Components

### `SalaryFilters`
- Props: `filters`, `monthYearOptions`, `onFilterChange`, `onApplyFilters`, `onClearFilters`
- Displays filter UI (employee search, month selection, action buttons)

### `SalaryTable`
- Props: `salaryData`, `loading`, `dataExists`, `monthYear`, `onViewDetails`, `onPay`, `onDownloadPDF`, `onLoanDeductChange`
- Displays the main salary table with conditional loading/empty states
- Uses `SalaryTableRow` for each row

### `SalaryTableRow`
- Props: `item`, `onView`, `onPay`, `onDownloadPDF`, `onLoanDeductChange`
- Displays individual employee salary row with action buttons

### `SalaryPagination`
- Props: `currentPage`, `totalPages`, `totalRecords`, `pageSize`, `onPageSizeChange`, `onPrevPage`, `onNextPage`, `onGoToPage`
- Displays pagination controls and page size selector

### `SalaryExportButtons`
- Props: `onPrint`, `onExportExcel`
- Displays print and Excel export buttons

## Migration Steps

To use the refactored component:

1. **Replace the old import** in your routing file:
   ```javascript
   // Old
   import MonthlySalary from './MonthlySalary';
   
   // New
   import MonthlySalary from './MonthlySalary.refactored';
   ```

2. **Or rename the files** (when ready to commit):
   - Backup old `MonthlySalary.jsx` → `MonthlySalary.old.jsx`
   - Rename `MonthlySalary.refactored.jsx` → `MonthlySalary.jsx`

3. **Test all features**:
   - Filter by employee name
   - Change month/year
   - Pagination
   - View details modal
   - Mark as paid
   - Download salary slip PDF
   - Export to Excel
   - Print report

## Benefits of Refactoring

✅ **Better Code Organization**
- Logic separated into focused hooks and components
- Easier to test individual pieces
- Clear separation of concerns

✅ **Improved Reusability**
- Hooks can be used in other components
- Components are pure and memoized
- No dependencies between unrelated features

✅ **Enhanced Maintainability**
- Smaller, readable files
- Each file has a single responsibility
- Easier to debug and modify

✅ **Better Performance**
- Component memoization prevents unnecessary re-renders
- Hooks optimize state updates
- Pagination and filtering are more efficient

✅ **Easier Testing**
- Individual hooks can be unit tested
- Components have clear prop contracts
- Easier to mock dependencies

## API & Data Flow

The refactored component maintains the same API endpoints:

- `GET /api/salary/monthly/exists` - Check if data exists
- `POST /api/salary/monthly/calculate` - Calculate salaries
- `GET /api/salary/monthly` - Fetch salary data

Data flow:
1. User selects month → `useSalaryData` checks if data exists
2. If not, calculates it → then fetches data
3. Data displayed in `SalaryTable` via `SalaryTableRow` components
4. User can view, pay, or download PDF via button callbacks
5. Pagination handled by `usePagination`
6. Exports handled by `useSalaryExport` and `useSalaryPDF`

## Notes

- All performance optimizations from the original component are preserved
- Memoization is applied where appropriate (`memo`, `useMemo`, `useCallback`)
- Error handling and toast notifications are maintained
- The component is backward compatible with existing data structures
