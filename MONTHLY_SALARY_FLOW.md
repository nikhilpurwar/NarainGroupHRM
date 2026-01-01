/**
 * MONTHLY SALARY CALCULATION & STORAGE FLOW
 * 
 * This document explains how the monthly salary system works:
 * 
 * 1. ATTENDANCE TRACKING (Attendance Model)
 *    - Records punch IN/OUT for each employee
 *    - Calculates totalHours, regularHours, overtimeHours
 *    - Marks status: present, absent, halfday, leave
 * 
 * 2. SALARY RULES (SalaryRule Model)
 *    - Configured per sub-department
 *    - Defines: fixedSalary, allowOT, absenceDeduction, etc.
 *    - Fallback to defaults if not configured
 * 
 * 3. MONTHLY SALARY CALCULATION (salary.service.js)
 *    - For each employee:
 *      a) Fetch attendance records for the month
 *      b) Fetch salary rule for their sub-department
 *      c) Calculate:
 *         - Basic Pay: (basichours * hourlyRate) or fixed salary
 *         - OT Pay: overtimeHours * (hourlyRate * 1.5)
 *         - Deductions: TDS, PF, ESI, Insurance, Advance, Loan, etc.
 *         - Net Pay: Total Pay - Total Deductions
 *      d) Return formatted salary object
 * 
 * 4. STORAGE (MonthlySalary Model)
 *    - Caches full month's salary data
 *    - Stores: monthKey, fromDate, toDate, items[], summary, totalRecords
 *    - Indexed by monthKey (e.g., '2025-12')
 *    - Updated via calculateAndStoreMonthlySalary endpoint
 * 
 * 5. API ENDPOINTS
 * 
 *    a) GET /api/salary/monthly/exists?month=2025-12
 *       - Checks if salary data is cached for the month
 *       - Returns: { exists: true/false, monthKey: '2025-12' }
 * 
 *    b) POST /api/salary/monthly/calculate
 *       - Body: { month: '2025-12' } or { month: 12, year: 2025 }
 *       - Calculates and stores monthly salary if not exists
 *       - Triggers automatically on first check if not found
 *       - Returns: { created: true, totalRecords: X }
 * 
 *    c) GET /api/salary/monthly?month=2025-12&page=1&pageSize=15
 *       - Fetches paginated monthly salary report
 *       - Uses cached data if available, otherwise calculates on-the-fly
 *       - Returns: { items: [...], summary: {...}, totalRecords: X }
 * 
 * 6. FRONTEND FLOW (MonthlySalary.jsx)
 * 
 *    Step 1: User selects month and clicks "Apply Filters"
 *    Step 2: checkDataExists() is called
 *            - Checks if salary cached via GET /api/salary/monthly/exists
 *            - If not cached, calls POST /api/salary/monthly/calculate
 *            - Sets dataExists state
 *    Step 3: If dataExists = true, fetchSalaryData() fetches via GET /api/salary/monthly
 *    Step 4: Data is displayed in table with pagination
 *    Step 5: User can export to PDF/Excel or print
 * 
 * 7. KEY FEATURES
 * 
 *    ✅ Based on actual attendance data
 *    ✅ Respects salary rules per department
 *    ✅ Handles fixed vs variable salary
 *    ✅ Calculates OT, deductions, advances, loans
 *    ✅ Cached in database for fast retrieval
 *    ✅ Auto-calculates on first access
 *    ✅ Pagination support
 *    ✅ Employee filtering
 *    ✅ Export to PDF/Excel
 * 
 * 8. TROUBLESHOOTING
 * 
 *    Q: No data showing?
 *    A: Check attendance records exist for selected month in Attendance collection
 * 
 *    Q: Wrong salary calculated?
 *    A: Check salary rules configured in Settings > Salary Rules
 *       Check employee sub-department is correct
 *       Check deductions assigned to employee
 * 
 *    Q: Data not storing?
 *    A: Check MongoDB connection and MonthlySalary model
 *       Check POST /api/salary/monthly/calculate returns success
 * 
 */

// Example Usage:

// 1. Check if data exists (auto-calculates if not)
// GET http://localhost:5100/api/salary/monthly/exists?month=2025-12

// 2. Fetch monthly salary report
// GET http://localhost:5100/api/salary/monthly?month=2025-12&page=1&pageSize=10

// 3. Trigger calculation manually
// POST http://localhost:5100/api/salary/monthly/calculate
// Body: { month: "2025-12" }
