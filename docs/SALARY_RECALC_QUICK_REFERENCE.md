# Quick Reference: Salary Recalculation Flow

## How It Works Now (After Implementation)

### 1. User Does Operation
- Punch in/out
- Add/update advance/loan
- Add/update employee
- Change salary/deductions

### 2. Backend Automatically Recalculates
```
salaryRecalcService.recalculateCurrentAndPreviousMonth()
     ↓
Computes salary for ALL employees in current month
     ↓
Updates MonthlySalaries collection
```

### 3. Frontend Displays Latest Data
```
Filter shows month/year
     ↓
Frontend GETs /api/salary/monthly?month=YYYY-M
     ↓
If cache exists → Shows data
If cache missing → Shows empty
```

---

## Key Points

### ✅ What Changed
- **Before**: Frontend calculated on demand + manual refresh
- **Now**: Backend auto-calculates + frontend displays cache

### ✅ No More Manual Calculations
- Don't need to click "Calculate" button
- Don't need to refresh manually
- Changes appear automatically

### ✅ Filter Behavior
- Select month → Shows data (if calculated)
- Select month → Shows empty (if not calculated yet)
- **No POST request when filtering**
- Only GET requests to fetch cached data

### ✅ When Does Calculation Happen
1. **Immediately after**: Punch in/out
2. **Immediately after**: Advance/loan operations  
3. **Immediately after**: Employee changes
4. **Manually**: Via POST /api/salary/monthly/calculate endpoint

---

## Data Consistency

| Scenario | What Happens |
|----------|--------------|
| Punch in today | Today's month salary recalculates immediately |
| Punch in last day of month | Both months (current + previous) recalculate |
| Add advance | Both months (current + previous) recalculate |
| Change employee salary | Both months (current + previous) recalculate |

---

## Frontend User Experience

### Scenario 1: View January 2025 Salary
```
1. User selects January 2025 in filter
2. Frontend checks: Does 2025-1 exist in cache?
3. YES → Shows salary data
4. NO → Shows "No salary data available"
```

### Scenario 2: Employee Punches In
```
1. Employee scans barcode
2. Punch recorded
3. Backend auto-recalculates salary
4. Frontend can now show updated salary
5. User sees new data when they refresh/reload page
```

### Scenario 3: Manager Changes Loan Amount
```
1. Manager updates loan deduction to 5000
2. Backend recalculates (deductions + net pay)
3. Frontend shows updated values
4. No refresh needed
```

---

## API Summary

### GET /api/salary/monthly/exists?month=2025-1
Check if monthKey exists
```json
Response: {
  "success": true,
  "data": {
    "exists": true,
    "monthKey": "2025-1"
  }
}
```

### GET /api/salary/monthly?month=2025-1&page=1&pageSize=15
Fetch salary data (only if monthKey exists)
```json
Response: {
  "success": true,
  "data": {
    "items": [...100 employees],
    "summary": {...},
    "totalRecords": 100,
    "monthKey": "2025-1"
  }
}
```

### POST /api/salary/monthly/calculate
Manually trigger salary calculation
```json
Body: { month: "2025-1", year: 2025 }
Response: {
  "success": true,
  "data": {
    "monthKey": "2025-1",
    "created": true,
    "totalRecords": 100
  }
}
```

### PATCH /api/salary/monthly/:empId/recalculate
Recalculate single employee (for loan changes)
```json
Body: { loanDeduct: 5000, month: "2025-1" }
Response: {
  "success": true,
  "data": {
    "loanDeduct": 5000,
    "totalDeductions": 6500,
    "netPay": 48500
  }
}
```

---

## Files Modified

### Backend
- `server/src/services/salaryRecalculation.service.js` (NEW)
- `server/src/controllers/salary.controller/monthlySalary.controller.js`
- `server/src/controllers/attendance.controller.js`
- `server/src/controllers/advance.controller.js`
- `server/src/controllers/employee.controller.js`

### Frontend
- `client/src/components/Main/Reports/Monthly Salary/hooks/useSalaryData.js`

---

## Troubleshooting

### "No salary data available" message
→ Salary hasn't been calculated for that month yet
→ Solution: Click on "Calculate Salary" button or perform an operation in that month

### Salary not updating after punch in
→ Browser cache issue
→ Solution: Refresh page or clear browser cache

### Loan deduction not changing
→ Recalculation happens async
→ Solution: Wait a moment and refresh page

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                       │
│  - MonthlySalary.jsx (displays data)                     │
│  - useSalaryData hook (fetches from API)                 │
└─────────────────────────────────────────────────────────┘
                          ↓ GET requests only
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Express.js)                     │
│  - monthlySalary.controller.js (returns cached data)    │
│  - salaryRecalculation.service.js (recalculates)        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              DATABASE (MongoDB)                           │
│  - MonthlySalaries collection (cached data)              │
│  - Employees, Attendance, Advances collections            │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

**Old Way**: Frontend → Filter → Calc → Display  
**New Way**: Backend → Auto Calc → Cache → Frontend Displays

**Result**: Always fresh, accurate salary data without manual intervention.
