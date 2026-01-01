# Loan Recalculation Feature

## Overview
This feature enables real-time server-side recalculation of monthly salaries when loan deduction amounts are modified in the UI. It ensures data consistency by updating the backend database and recalculating dependent fields (totalDeductions, netPay).

## Architecture

### Frontend Hook: `useLoanRecalculation`
Located: `hooks/useLoanRecalculation.js`

**Purpose**: Manages the client-side logic for loan deduction changes with debouncing and server communication.

**Key Features**:
- **Immediate UI Update**: Changes reflect instantly in the UI for better UX
- **Debouncing**: Waits 500ms after the last change before calling the server to prevent API spam
- **Server Synchronization**: Makes PATCH request to update backend and get recalculated values
- **Error Handling**: Shows toast notifications for success/error states
- **Memory Management**: Cleanup function clears all pending timers on unmount

**API**:
```javascript
const { handleLoanDeductChange, recalculateSalaryOnServer, cleanup } = useLoanRecalculation(setSalaryData, selectedMonth);

// Parameters:
// - setSalaryData: React state setter function for salary data
// - selectedMonth: Current month being viewed (format: 'YYYY-M')

// Returns:
// - handleLoanDeductChange(employee, newValue): Main handler for input changes
// - recalculateSalaryOnServer(employee, newLoanDeduct): Direct server call (if needed)
// - cleanup(): Clear all pending debounce timers
```

**Usage Example**:
```javascript
const MonthlySalary = () => {
  const [salaryData, setSalaryData] = useState([]);
  const { handleLoanDeductChange, cleanup } = useLoanRecalculation(setSalaryData, '2025-1');

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <SalaryTable onLoanDeductChange={handleLoanDeductChange} />
  );
};
```

### Backend Endpoint

**Route**: `PATCH /api/salary/monthly/:empId/recalculate`

**Controller**: `recalculateSalaryForEmployee` in `monthlySalary.controller.js`

**Request Body**:
```json
{
  "loanDeduct": 5000,
  "month": "2025-1"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "loanDeduct": 5000,
    "totalDeductions": 7500,
    "netPay": 42500
  },
  "message": "Salary recalculated successfully"
}
```

**Algorithm**:
1. Parse month parameter to get date range
2. Find employee by empId
3. Compute salary using `salaryService.computeSalaryReport()`
4. Calculate differences: `loanDiff = newLoanDeduct - oldLoanDeduct`
5. Recalculate totals:
   - `newTotalDeductions = totalDeductions + loanDiff`
   - `newNetPay = netPay - loanDiff`
6. Update stored monthly record in database
7. Return updated values to client

## Data Flow

```
User Input Change
    ↓
handleLoanDeductChange (debounced)
    ↓
Immediate UI Update (setSalaryData)
    ↓
Wait 500ms (no more changes)
    ↓
PATCH /api/salary/monthly/:empId/recalculate
    ↓
Backend Recalculation
    ↓
Update Database (MonthlySalaryModel)
    ↓
Return { loanDeduct, totalDeductions, netPay }
    ↓
Update UI with Server Values
    ↓
Show Success/Error Toast
```

## Integration Points

### 1. Main Component
File: `MonthlySalary.refactored.jsx`

```javascript
import { useLoanRecalculation } from './hooks';

const { handleLoanDeductChange, cleanup } = useLoanRecalculation(setSalaryData, filters.month);

// Pass to table component
<SalaryTable onLoanDeductChange={handleLoanDeductChange} />

// Cleanup effect
useEffect(() => {
  return () => cleanup();
}, [cleanup]);
```

### 2. Table Row Component
File: `components/SalaryTableRow.jsx`

```javascript
<input
  type="number"
  value={employee.loanDeduct || 0}
  onChange={(e) => onLoanDeductChange(employee, parseFloat(e.target.value) || 0)}
  className="w-full px-2 py-1 border rounded"
/>
```

## Configuration

### Debounce Delay
Default: 500ms (0.5 seconds)

Can be modified in `useLoanRecalculation.js`:
```javascript
debounceTimers.current[employeeId] = setTimeout(() => {
  recalculateSalaryOnServer(employee, newValue);
}, 500); // Change this value
```

### API URL
Configured via environment variable:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';
```

## Error Handling

### Client-Side Errors
- Network failures: Shows error toast with message
- Invalid responses: Logs to console and shows generic error toast
- Debounce timers: Automatically cleared on unmount

### Server-Side Errors
- Employee not found (404): Returns error message
- Invalid month format (400): Returns validation error
- No salary data (404): Returns informative message
- Database errors: Caught by asyncHandler middleware

## Performance Considerations

1. **Debouncing**: Prevents API spam when user is rapidly typing
2. **Immediate UI Updates**: User sees changes instantly without waiting for server
3. **Efficient State Updates**: Uses functional state updates to avoid stale closures
4. **Memory Management**: Cleanup function prevents memory leaks
5. **Selective Updates**: Only updates the specific employee row, not entire dataset

## Testing Scenarios

1. **Single Change**: Modify loan value → wait 500ms → verify API call
2. **Rapid Changes**: Type quickly → verify only last value is sent to server
3. **Multiple Employees**: Change multiple employees → verify independent timers
4. **Unmount During Debounce**: Close modal/navigate away → verify timers are cleared
5. **Network Error**: Disconnect network → verify error handling
6. **Server Error**: Modify to trigger 404 → verify error message
7. **Month Change**: Change month filter → verify new context is used

## Migration Notes

### From Old Implementation
The previous implementation only updated the UI locally:

```javascript
// OLD: Client-side only
const handleLoanDeductChange = (employee, value) => {
  setSalaryData((prev) =>
    prev.map((item) =>
      (item.empId || item.id) === (employee.empId || employee.id)
        ? { ...item, loanDeduct: value }
        : item
    )
  );
};
```

### To New Implementation
Now includes server synchronization:

```javascript
// NEW: Server-side with debouncing
const { handleLoanDeductChange } = useLoanRecalculation(setSalaryData, filters.month);
// Automatically handles UI update + server call + recalculation
```

## Future Enhancements

1. **Optimistic Updates**: Show loading indicator during server call
2. **Rollback on Error**: Revert to original value if server call fails
3. **Batch Updates**: Allow multiple changes before syncing (with user confirmation)
4. **Validation**: Add min/max validation on loan deduction amount
5. **Audit Trail**: Log all loan deduction changes with timestamp and user
6. **Undo/Redo**: Implement change history for accidental modifications

## Dependencies

### Frontend
- React 18+ (useState, useEffect, useRef, useCallback)
- axios (HTTP client)
- react-toastify (Notifications)

### Backend
- Express.js (Route handling)
- Mongoose (Database operations)
- asyncHandler middleware (Error handling)
- salaryService (Salary calculations)

## Related Files

### Frontend
- `hooks/useLoanRecalculation.js` - Main hook implementation
- `hooks/index.js` - Hook exports
- `MonthlySalary.refactored.jsx` - Main component
- `components/SalaryTable.jsx` - Table wrapper
- `components/SalaryTableRow.jsx` - Row with input field

### Backend
- `routes/salary.route.js` - Route definition
- `controllers/salary.controller/monthlySalary.controller.js` - Endpoint handler
- `services/salary.service.js` - Calculation logic
- `models/salary.model/monthlySalary.model.js` - Database schema

## API Documentation

### Endpoint Details

**Endpoint**: `PATCH /api/salary/monthly/:empId/recalculate`

**Authentication**: Required (JWT token)

**Rate Limiting**: No specific limits (debouncing on client prevents abuse)

**Request Parameters**:
- `empId` (URL param): Employee ID (string)
- `loanDeduct` (body): New loan deduction amount (number)
- `month` (body): Month in format 'YYYY-M' (string)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "loanDeduct": 5000,
    "totalDeductions": 7500,
    "netPay": 42500
  },
  "message": "Salary recalculated successfully"
}
```

**Error Responses**:

400 - Invalid Request:
```json
{
  "success": false,
  "message": "month is required"
}
```

404 - Not Found:
```json
{
  "success": false,
  "message": "Employee not found"
}
```

500 - Server Error:
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Troubleshooting

### Issue: Changes not saving
**Solution**: Check browser console for API errors, verify backend is running

### Issue: Multiple API calls on single change
**Solution**: Verify debounce timer is 500ms, check for multiple event listeners

### Issue: UI not updating after server response
**Solution**: Check setSalaryData is being called correctly, verify state structure

### Issue: Cleanup errors on unmount
**Solution**: Ensure cleanup() is called in useEffect return function

### Issue: Wrong month data being updated
**Solution**: Verify filters.month is passed correctly to useLoanRecalculation

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Author**: GitHub Copilot
