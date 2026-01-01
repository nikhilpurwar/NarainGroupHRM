# Backend-Driven Salary Calculation Architecture

## Overview
All salary calculations now happen in the backend. The frontend only displays cached data from the `MonthlySalaries` collection based on the selected month/year filter.

## Key Changes

### 1. Backend Salary Recalculation Service
**File**: `server/src/services/salaryRecalculation.service.js`

**Functions**:
- `recalculateAndUpdateMonthlySalary(date)` - Recalculates salary for a specific month and updates the cache
- `recalculateCurrentAndPreviousMonth()` - Batch recalculation for current and previous month

**Triggered By**:
- Punch In/Out
- Advance/Loan creation or update
- Employee creation or update

### 2. Updated Salary Report API
**Endpoint**: `GET /api/salary/monthly?month=YYYY-M&page=1&pageSize=15`

**Behavior**:
- ✅ Returns cached data from `MonthlySalaries` collection if `monthKey` exists
- ❌ Returns empty array if `monthKey` doesn't exist (no on-demand calculation)
- Applies employee name filter and pagination on cached data
- Returns data in format:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "summary": {...},
    "totalRecords": 100,
    "monthKey": "2025-1",
    "fromDate": "2025-01-01T00:00:00Z",
    "toDate": "2025-01-31T23:59:59Z"
  }
}
```

### 3. Calculation Trigger Points

**Punch In/Out** → `recalculateCurrentAndPreviousMonth()`
```javascript
// In attendance.controller.js handlePunchIn/Out
salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
  console.error('Salary recalculation failed:', err)
);
```

**Advance/Loan Operations** → `recalculateCurrentAndPreviousMonth()`
```javascript
// In advance.controller.js createAdvance/updateAdvance
salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
  console.error('Salary recalculation failed:', err)
);
```

**Employee Operations** → `recalculateCurrentAndPreviousMonth()`
```javascript
// In employee.controller.js createEmployee/updateEmployee
salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
  console.error('Salary recalculation failed:', err)
);
```

### 4. Frontend Filter Behavior

**Flow**:
```
User selects Month/Year in filter
       ↓
Frontend calls GET /api/salary/monthly?month=YYYY-M
       ↓
Backend checks MonthlySalaries collection for monthKey
       ↓
If monthKey exists → Return cached items
If monthKey missing → Return empty array with message
       ↓
Frontend displays items or "No data available" message
```

**Important**: No POST request is made when selecting month/year. Only GET requests to fetch cached data.

### 5. Data Flow Diagram

```
Operation (Punch In/Out, Advance, Employee)
    ↓
Controller handles operation
    ↓
Controller triggers: recalculateCurrentAndPreviousMonth()
    ↓
Service: computeSalaryReport() [computes all employees for month]
    ↓
Service: MonthlySalaryModel.findOneAndUpdate() [upserts to cache]
    ↓
Database: MonthlySalaries collection updated
    ↓
Response sent to client
    ↓
Frontend automatically refreshes salary data
```

### 6. Cache Structure in MonthlySalaries Collection

```javascript
{
  _id: ObjectId,
  monthKey: "2025-1",          // Unique index
  fromDate: Date,
  toDate: Date,
  items: [                       // All employees for the month
    {
      empId: "E001",
      empName: "John",
      basicPay: 50000,
      otPay: 5000,
      totalPay: 55000,
      tds: 5500,
      totalDeductions: 6000,
      netPay: 49000,
      ...
    },
    ...
  ],
  summary: {
    totalPayable: 5500000,
    totalOvertime: 50000,
    totalEmployees: 100,
    totalWorkingHours: 17600,
    totalDeductions: 600000,
    totalNetPay: 4900000
  },
  totalRecords: 100,
  createdAt: Date,
  updatedAt: Date
}
```

## Implementation Details

### Calculation Service
```javascript
export async function recalculateAndUpdateMonthlySalary(date = new Date()) {
  // 1. Parse month from date
  const monthKey = `${year}-${month}`
  
  // 2. Compute salary for all active employees
  const report = await salaryService.computeSalaryReport({
    fromDate: monthStart,
    toDate: monthEnd,
    page: 1,
    pageSize: 10000
  })
  
  // 3. Update MonthlySalaryModel with upsert
  await MonthlySalaryModel.findOneAndUpdate(
    { monthKey },
    { monthKey, fromDate, toDate, items, summary, totalRecords },
    { upsert: true, new: true }
  )
  
  return result
}
```

### Controller Implementation
```javascript
export const monthlySalaryReport = asyncHandler(async (req, res) => {
  const { month, employeeName, page, pageSize } = req.query
  
  // 1. Parse month parameter
  const monthKey = parseMonth(month)
  
  // 2. Get cached data only
  const cached = await MonthlySalaryModel.findOne({ monthKey }).lean()
  
  if (!cached) {
    // No data yet - return empty
    return res.json({
      success: true,
      data: {
        items: [],
        summary: {},
        totalRecords: 0,
        monthKey
      }
    })
  }
  
  // 3. Apply filters on cached items
  let items = cached.items
  if (employeeName) {
    items = items.filter(item => 
      item.empName.includes(employeeName) || 
      item.empId.includes(employeeName)
    )
  }
  
  // 4. Apply pagination
  const paginatedItems = items.slice(skip, skip + pageSize)
  
  // 5. Return paginated response
  res.json({
    success: true,
    data: {
      items: paginatedItems,
      summary: cached.summary,
      totalRecords: items.length
    }
  })
})
```

## Frontend Changes

### MonthlySalary Component
- No changes to component structure (already compatible)
- `useSalaryData` hook removes automatic calculation
- Only fetches data if `monthKey` exists in cache
- Displays "No salary data available" if monthKey missing

### useSalaryData Hook
```javascript
const checkDataExists = useCallback(async () => {
  // Check if monthKey exists in MonthlySalaries
  const response = await axios.get(`${API_URL}/api/salary/monthly/exists`, 
    { params: { month: filters.month } }
  )
  
  // DON'T calculate on demand - just check existence
  const exists = response.data.data?.exists || false
  setDataExists(exists)
  return exists
}, [filters.month])
```

## Advantages

✅ **Consistency**: Single source of truth for salary calculations
✅ **Performance**: Cached calculations, no repeated computations
✅ **Accuracy**: All calculations centralized in backend
✅ **Real-time**: Salary updates immediately after any operation
✅ **Scalability**: Can handle batch recalculations efficiently
✅ **Auditability**: All changes tracked in database timestamps

## When Data Gets Recalculated

| Event | Trigger | Months Affected |
|-------|---------|-----------------|
| Punch In/Out | Immediately | Current + Previous |
| Add Advance | Immediately | Current + Previous |
| Update Advance | Immediately | Current + Previous |
| Delete Advance | Immediately | Current + Previous |
| Create Employee | Immediately | Current + Previous |
| Update Employee Salary | Immediately | Current + Previous |
| Update Deductions | Immediately | Current + Previous |
| Manual Recalculate | Via API | Specified month |

## API Endpoints

### 1. Check if Data Exists
```
GET /api/salary/monthly/exists?month=2025-1
→ { success: true, data: { exists: true, monthKey: "2025-1" } }
```

### 2. Get Monthly Salary Data
```
GET /api/salary/monthly?month=2025-1&page=1&pageSize=15&employeeName=John
→ { success: true, data: { items: [...], summary: {...}, totalRecords: 50 } }
```

### 3. Calculate/Recalculate Salary (Manual)
```
POST /api/salary/monthly/calculate
Body: { month: "2025-1", year: 2025 }
→ { success: true, data: { monthKey: "2025-1", created: true } }
```

### 4. Recalculate Single Employee Loan
```
PATCH /api/salary/monthly/:empId/recalculate
Body: { loanDeduct: 5000, month: "2025-1" }
→ { success: true, data: { loanDeduct, totalDeductions, netPay } }
```

## Error Scenarios

### Scenario 1: Filter for Month with No Data
```
User selects Jan 2025 (not calculated yet)
→ API returns: { items: [], totalRecords: 0 }
→ UI shows: "No salary data available for January 2025"
```

### Scenario 2: Punch In/Out Operation
```
Employee punches in
→ Attendance record created
→ Salary recalculation triggered
→ MonthlySalaries cache updated
→ UI can now fetch and display updated data
```

### Scenario 3: Loan Deduction Change
```
User changes loan amount
→ Recalculation happens on server
→ MonthlySalaries cache updated
→ UI shows new totalDeductions and netPay
```

## Testing Checklist

- [ ] Punch in/out → salary cache updates
- [ ] Create advance → salary cache updates
- [ ] Update advance amount → salary cache updates
- [ ] Add new employee → salary cache updates
- [ ] Update employee salary → salary cache updates
- [ ] Filter by month with data → shows data
- [ ] Filter by month without data → shows empty
- [ ] Pagination works on filtered data
- [ ] Employee name filter works on cached data
- [ ] Loan deduction change recalculates correctly

---

**Architecture Pattern**: Backend-Driven Cache with Frontend Display
**Cache Strategy**: Monthly aggregation with selective invalidation
**Update Pattern**: Synchronous recalculation after operations
