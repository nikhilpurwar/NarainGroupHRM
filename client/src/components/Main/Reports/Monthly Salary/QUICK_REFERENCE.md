# Refactored MonthlySalary - Quick Reference

## File Structure

```
hooks/
  ├── useSalaryFilters.js      - Filter state (employeeName, month)
  ├── useSalaryData.js         - Fetch & manage salary data
  ├── usePagination.js         - Pagination logic (page, pageSize)
  ├── useSalaryModal.js        - Modal state (open/close, selected)
  ├── useDateHelper.js         - Month/year options & formatting
  ├── useSalaryExport.js       - PDF/Excel/Print exports (bulk)
  └── useSalaryPDF.js          - Individual employee PDF slip

components/
  ├── SalaryFilters.jsx        - Filter UI (search, month select)
  ├── SalaryTable.jsx          - Main table with loading/empty states
  ├── SalaryTableRow.jsx       - Single employee row
  ├── SalaryPagination.jsx     - Pagination UI controls
  └── SalaryExportButtons.jsx  - Print & Excel buttons

MonthlySalary.refactored.jsx   - Main orchestrator component
```

## Key Hook Responsibilities

| Hook | Purpose | Key State |
|------|---------|-----------|
| `useSalaryFilters` | Filter management | `employeeName`, `month` |
| `useSalaryData` | Data fetching | `salaryData`, `loading`, `dataExists` |
| `usePagination` | Page control | `currentPage`, `pageSize`, `totalPages` |
| `useSalaryModal` | Modal control | `isModalOpen`, `selectedEmployee` |
| `useDateHelper` | Date utilities | `monthYearOptions`, formatting |
| `useSalaryExport` | Bulk exports | PDF, Excel, Print functions |
| `useSalaryPDF` | Individual PDF | `downloadEmployeePDF` function |

## Component Props Summary

```javascript
// SalaryFilters
<SalaryFilters
  filters={filters}
  monthYearOptions={monthYearOptions}
  onFilterChange={handleFilterChange}
  onApplyFilters={handleApplyFilters}
  onClearFilters={handleClearFilters}
/>

// SalaryTable
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

// SalaryPagination
<SalaryPagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalRecords={totalRecords}
  pageSize={pageSize}
  onPageSizeChange={(newSize) => setPageSize(newSize)}
  onPrevPage={goPrev}
  onNextPage={goNext}
  onGoToPage={goToPage}
/>

// SalaryExportButtons
<SalaryExportButtons
  onPrint={handlePrintReport}
  onExportExcel={handleExportExcel}
/>
```

## Main Component Usage

```javascript
import {
  useSalaryFilters,
  useSalaryData,
  usePagination,
  useSalaryModal,
  useDateHelper,
  useSalaryExport,
  useSalaryPDF
} from './hooks';

import {
  SalaryFilters,
  SalaryTable,
  SalaryPagination,
  SalaryExportButtons
} from './components';

// In component:
const { filters, handleFilterChange, clearFilters } = useSalaryFilters();
const { monthYearOptions, getSelectedMonthYearLabel } = useDateHelper(filters.month);
const { salaryData, setSalaryData, loading, dataExists, checkDataExists, fetchSalaryData } = useSalaryData(filters, currentPage, pageSize);
const { currentPage, setCurrentPage, totalPages, goToPage, goPrev, goNext } = usePagination(totalRecords, pageSize);
const { isModalOpen, selectedEmployee, openModal, closeModal, updateSelectedEmployee } = useSalaryModal();
const { exportToPDF, exportToExcel, printReport } = useSalaryExport(getSelectedMonthYearLabel);
const { downloadEmployeePDF } = useSalaryPDF(getSelectedMonthYearLabel);
```

## Data Flow

```
User Action
    ↓
Hook updates state
    ↓
Component re-renders with new props
    ↓
UI updates
    ↓
User sees results
```

Examples:
- **Filter**: User selects month → `useSalaryFilters` updates → `useSalaryData` fetches → `SalaryTable` re-renders
- **Export**: User clicks export → `useSalaryExport` generates PDF → Downloads to disk
- **View Details**: User clicks view → `useSalaryModal` opens → `ViewSalaryReport` renders
- **Pagination**: User clicks next → `usePagination` updates page → `useSalaryData` refetches → `SalaryTable` updates

## Performance Optimizations

✅ `React.memo()` on all components
✅ `useCallback()` on all event handlers
✅ `useMemo()` for derived values
✅ Lazy rendering of pagination buttons
✅ Efficient data mapping in hooks

## Integration Checklist

- [ ] All 7 hooks created in `hooks/` folder
- [ ] All 5 components created in `components/` folder
- [ ] `ViewSalaryReport.jsx` imports remain unchanged
- [ ] `MonthlySalary.refactored.jsx` created and tested
- [ ] All API endpoints still responding correctly
- [ ] All filters work (employee name, month)
- [ ] Pagination working (page, page size)
- [ ] Modal opens and closes
- [ ] View Details displays correctly
- [ ] Pay button marks as paid
- [ ] PDF downloads work (individual + bulk)
- [ ] Excel export works
- [ ] Print function works

## To Deploy

1. Test thoroughly in development
2. Compare behavior with original component
3. Rename files: `MonthlySalary.jsx` → `MonthlySalary.old.jsx`
4. Rename: `MonthlySalary.refactored.jsx` → `MonthlySalary.jsx`
5. Git commit with message: "refactor: modularize MonthlySalary into hooks + components"
6. Deploy to production
