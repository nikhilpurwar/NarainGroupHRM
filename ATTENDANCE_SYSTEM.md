# Attendance System Documentation

## Overview
The attendance system tracks employee punch-in/out times and automatically calculates worked hours and overtime.

## Key Features

### 1. **Attendance Tracking Rules**
- **Starts from**: Employee's joining date (when added to system)
- **Weekdays only**: Weekends (Sat, Sun) are skipped
- **No record**: Shows as "--" (dash) in table
- **Manual marking**: Records current time as IN time
- **Barcode scanning**: Uses 72-hour rule for punch OUT (completes last incomplete attendance)

### 2. **Auto-Absent Marking**
- **Trigger**: When viewing attendance report for any past date
- **Condition**: 
  - Date is in the past
  - Date is after employee's joining date
  - Date is a working day (not weekend)
  - No attendance record exists for that date
- **Action**: Automatically marks as "Absent"
- **Note**: Recorded as "Auto-marked absent (no attendance record)"

### 3. **Table Columns**

| Column | Shows | Rules |
|--------|-------|-------|
| **Status** | P/A/H/L | Present, Absent, Half-day, Leave |
| **In** | HH:MM:SS | Punch-in time (clickable to see details) |
| **Out** | HH:MM:SS | Punch-out time (clickable to see details) |
| **Worked Hours** | X.XXh | Calculated from In-Out (only if both exist) |
| **OT (Hours)** | X.XXh | Hours beyond shift (based on employee.workHours) |

### 4. **Hours Calculation**

```
Total Hours = Out Time - In Time
Shift Hours = employee.workHours (default: 8)

If Total Hours <= Shift Hours:
  Regular Hours = Total Hours
  Overtime Hours = 0
Else:
  Regular Hours = Shift Hours
  Overtime Hours = Total Hours - Shift Hours
```

### 5. **Mark Attendance**

#### Manual Marking
```
POST /api/employees/{id}/attendance
Body: {
  date: "2025-12-18",
  status: "present"  // optional, default: "present"
}

Response captures:
- inTime: Current time (auto-captured)
- status: present/absent
- totalHours: 0 (until punch OUT)
- regularHours: 0
- overtimeHours: 0
```

#### Barcode Scanning
```
POST /api/store-emp-attend?code={empId}
Body: {
  date: "2025-12-18"
}

Rules:
- If no incomplete attendance: Create new IN record
- If incomplete attendance exists within 72 hours: Mark OUT (calculate hours)
- If incomplete attendance > 72 hours old: Create new IN record
```

### 6. **Punch Records Modal**

Click any **In** or **Out** time to open detailed modal showing:
- Shift hours
- Total worked hours
- Regular vs. Overtime breakdown
- Punch log table:
  - Punch Type (IN/OUT)
  - Time
  - Duration from previous punch

### 7. **Shift-End Auto-Absent**

When attendance report is viewed:
1. System checks all dates from employee's joining date to today
2. For each working day without a record:
   - Marks as "Absent"
   - Saves to database
3. Does not affect future dates

## Backend Endpoints

### Get Attendance Report
```
GET /api/attendance-report?employeeId={id}&month={m}&year={y}
```
Returns: Employee data + days + table with Status/In/Out/Note rows

### Mark Attendance (Manual)
```
POST /api/employees/{id}/attendance
Body: { date, status }
```

### Punch IN/OUT (Barcode)
```
POST /api/store-emp-attend?code={empId}
Body: { date }
```

## Frontend Components

### Attendance.jsx
- Main component
- Fetches report and builds enhanced table (adds Worked Hours + OT rows)
- Handles manual marking and punch OUT
- Manages punch records modal

### AttendanceTable.jsx
- Displays table with color-coded rows
- In/Out cells are clickable
- Shows "--" for empty cells
- Responsive (mobile + desktop)

### PunchRecordsModal.jsx
- Shows detailed punch records
- Displays time calculations
- Shows shift hours and worked/regular/OT breakdown

## Frontend-Backend Data Flow

```
1. User views attendance report
2. Frontend calls GET /api/attendance-report?employeeId=X
3. Backend:
   - Auto-marks absent for missing past dates
   - Returns table: Status, In, Out, Note rows
4. Frontend:
   - Adds Worked Hours and OT (Hours) rows
   - Renders AttendanceTable with click handlers
5. User marks attendance manually
6. Frontend calls POST /api/employees/{id}/attendance
7. Backend records inTime + current time
8. User clicks punch OUT or barcode
9. Backend calculates hours + marks OUT
10. Frontend refreshes to show new data
```

## Test Scenarios

### Scenario 1: Manual Attendance Marking
1. Go to Attendance module
2. Click employee name
3. Click "Mark Attendance" button
4. ✅ Should show IN time in table
5. Click employee again to refresh
6. ✅ Should show worked hours as "--" (no OUT yet)

### Scenario 2: Barcode Punch OUT
1. After marking attendance
2. Click barcode icon
3. Scan barcode or enter code
4. ✅ Should punch OUT
5. ✅ Should show worked hours and OT calculated
6. Click IN/OUT time to see punch log

### Scenario 3: Auto-Absent
1. Add new employee today
2. Wait until tomorrow
3. View attendance for previous date
4. ✅ Previous working date should show "A" (Absent)

## Known Behaviors

- **Weekend skipping**: Sat/Sun never marked absent
- **Future dates**: Show as "--" (no auto-marking)
- **Edit not allowed**: Once marked, re-mark shows error (by design)
- **In/Out clickable**: Only when both exist in current logic
- **Modal**: Shows punch details only when in/out recorded
