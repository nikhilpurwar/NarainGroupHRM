# MonthlySalary Component Architecture

## Component Tree

```
MonthlySalary (Main Orchestrator)
│
├── SalarySummaryStats (Memoized)
│   └── Displays: Total Payroll, Deductions, Net Payable, Avg Salary
│
├── SalaryFilters
│   └── Input: filters, monthYearOptions
│   └── Output: onFilterChange, onApplyFilters, onClearFilters
│
├── SalaryExportButtons
│   └── Output: onPrint, onExportExcel
│
├── SalaryTable
│   ├── Conditional Renders:
│   │   ├── Loading State
│   │   ├── Empty State (No Data)
│   │   └── Data State (with SalaryTableRow children)
│   │
│   └── SalaryTableRow (for each employee)
│       └── Displays: Employee data + Action buttons
│       └── Output: onView, onPay, onDownloadPDF, onLoanDeductChange
│
├── SalaryPagination
│   └── Controls: Previous, Page numbers, Next
│   └── Output: onPageSizeChange, onPrevPage, onNextPage, onGoToPage
│
└── ViewSalaryReport (Modal)
    └── Displays: Detailed salary breakdown for selected employee
```

## State Management with Hooks

```
useSalaryFilters()
├── State: filters (employeeName, month)
├── Functions: handleFilterChange, clearFilters
└── Used by: SalaryFilters, useSalaryData

useSalaryData(filters, currentPage, pageSize)
├── State: salaryData, loading, dataExists, checkedMonth, totalRecords
├── Functions: checkDataExists(), fetchSalaryData()
└── Dependencies: filters, currentPage, pageSize

usePagination(totalRecords, pageSize)
├── State: currentPage, totalPages
├── Functions: goToPage, goPrev, goNext, resetPage
└── Used by: SalaryPagination, main component

useSalaryModal()
├── State: isModalOpen, selectedEmployee
├── Functions: openModal(), closeModal(), updateSelectedEmployee()
└── Used by: SalaryTable -> ViewSalaryReport

useDateHelper(selectedMonth)
├── State: monthYearOptions
├── Functions: getSelectedMonthYearLabel()
└── Used by: SalaryFilters, useSalaryExport, useSalaryPDF

useSalaryExport(getSelectedMonthYearLabel)
├── Functions: exportToPDF(), exportToExcel(), printReport()
└── Used by: SalaryExportButtons

useSalaryPDF(getSelectedMonthYearLabel)
├── Functions: downloadEmployeePDF()
└── Used by: SalaryTable (via SalaryTableRow)
```

## Data Flow Diagram

### Feature: Filter & Search
```
User selects month
    ↓
handleApplyFilters()
    ↓
checkDataExists() [useSalaryData]
    ↓
fetchSalaryData() [useSalaryData]
    ↓
setSalaryData() [useSalaryData]
    ↓
<SalaryTable> re-renders with new data
```

### Feature: View Employee Details
```
User clicks Eye icon (View Details)
    ↓
openModal(employee) [useSalaryModal]
    ↓
setSelectedEmployee(employee)
    ↓
isModalOpen = true
    ↓
<ViewSalaryReport> renders with selectedEmployee
```

### Feature: Download Salary Slip PDF
```
User clicks FileText icon (Download PDF)
    ↓
handleDownloadEmployeePDF(employee)
    ↓
downloadEmployeePDF(employee) [useSalaryPDF]
    ↓
Creates jsPDF with salary details
    ↓
doc.save() triggers browser download
    ↓
toast.success() shows confirmation
```

### Feature: Export Bulk PDF
```
User clicks Export PDF button
    ↓
handleExportPDF()
    ↓
exportToPDF(salaryData, filters) [useSalaryExport]
    ↓
Creates jsPDF with table of all employees
    ↓
doc.save() triggers browser download
    ↓
toast.success() shows confirmation
```

## Props Flow

```
MonthlySalary
    │
    ├── → SalarySummaryStats
    │       Props: { salaryData }
    │
    ├── → SalaryFilters
    │       Props: { filters, monthYearOptions, onFilterChange, onApplyFilters, onClearFilters }
    │
    ├── → SalaryExportButtons
    │       Props: { onPrint, onExportExcel }
    │
    ├── → SalaryTable
    │       Props: { salaryData, loading, dataExists, monthYear, onViewDetails, onPay, onDownloadPDF, onLoanDeductChange }
    │       │
    │       └── → SalaryTableRow (multiple)
    │               Props: { item, onView, onPay, onDownloadPDF, onLoanDeductChange }
    │
    ├── → SalaryPagination
    │       Props: { currentPage, totalPages, totalRecords, pageSize, onPageSizeChange, onPrevPage, onNextPage, onGoToPage }
    │
    └── → ViewSalaryReport (Modal)
            Props: { isOpen, onClose, employee, monthYear, onPay, onDownloadPDF }
```

## Performance Optimization Points

```
MonthlySalary
    │
    ├─ memo() → Prevents re-render if props don't change
    │
    ├─ useCallback(handleFilterChange) → Stable function reference
    ├─ useCallback(handleApplyFilters) → Stable function reference
    ├─ useCallback(handlePay) → Stable function reference
    ├─ useCallback(handleDownloadPDF) → Stable function reference
    ├─ useCallback(handleExportPDF) → Stable function reference
    │
    ├─ useSalaryFilters() → Encapsulates filter state
    ├─ useSalaryData() → Encapsulates data fetching
    ├─ usePagination() → Encapsulates pagination logic
    ├─ useSalaryModal() → Encapsulates modal state
    │
    ├─ SalarySummaryStats (memo)
    │   └─ useMemo calculations inside
    │
    ├─ SalaryTable (memo)
    │   └─ SalaryTableRow (memo × N)
    │       └─ Each row only re-renders if its 'item' changes
    │
    ├─ SalaryFilters (memo)
    ├─ SalaryExportButtons (memo)
    ├─ SalaryPagination (memo)
    └─ ViewSalaryReport (already memoized)
```

## External Dependencies

```
MonthlySalary
│
├─ react (hooks: useState, useEffect)
├─ axios (API calls in useSalaryData)
├─ react-toastify (toast notifications)
├─ jspdf + jspdf-autotable (PDF generation)
├─ xlsx (Excel export)
├─ lucide-react (icons)
└─ tailwindcss (styling)
```

## API Endpoints Used

```
MonthlySalary (via useSalaryData)
│
├─ GET /api/salary/monthly/exists
│   └─ Check if salary data exists for month
│
├─ POST /api/salary/monthly/calculate
│   └─ Calculate salaries if they don't exist
│
└─ GET /api/salary/monthly
    └─ Fetch paginated salary data
        Query params: { employeeName, month, page, pageSize }
```

## File Dependencies Map

```
MonthlySalary.refactored.jsx
    │
    ├─ imports from ./hooks/index.js
    │   ├─ useSalaryFilters
    │   ├─ useSalaryData
    │   ├─ usePagination
    │   ├─ useSalaryModal
    │   ├─ useDateHelper
    │   ├─ useSalaryExport
    │   └─ useSalaryPDF
    │
    ├─ imports from ./components/index.js
    │   ├─ SalaryFilters
    │   ├─ SalaryTable
    │   ├─ SalaryPagination
    │   └─ SalaryExportButtons
    │
    └─ imports from ./ViewSalaryReport.jsx
        └─ ViewSalaryReport (modal component)

SalaryTable.jsx
    └─ imports from ./SalaryTableRow.jsx

useSalaryData.js
    ├─ imports axios
    ├─ imports toast
    └─ uses API_URL environment variable

useSalaryExport.js
    ├─ imports jsPDF
    ├─ imports 'jspdf-autotable'
    ├─ imports XLSX
    └─ imports toast

useSalaryPDF.js
    ├─ imports jsPDF
    ├─ imports 'jspdf-autotable'
    └─ imports toast
```

---

**Architecture is clean, modular, and optimized for performance! ✨**
