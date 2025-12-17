# Salary Calculation Module - Database Schema Reference

## Overview
The attendance system now stores detailed in/out timing information that can be used for accurate salary calculations.

## Database Schema - Attendance Fields

### Stored in Each Attendance Record:

```javascript
{
  date: Date,                          // Attendance date (YYYY-MM-DD)
  status: String,                      // "present" or "absent"
  inTime: String,                      // HH:mm:ss format (e.g., "09:30:00")
  outTime: String,                     // HH:mm:ss format (e.g., "17:45:00")
  totalHours: Number,                  // Total hours worked (e.g., 8.25)
  regularHours: Number,                // Regular shift hours (e.g., 8.00)
  overtimeHours: Number,               // Overtime hours (e.g., 0.25)
  breakMinutes: Number,                // Break duration in minutes
  isWeekend: Boolean,                  // Sunday/Saturday flag
  isHoliday: Boolean,                  // Holiday flag
  punchLogs: [                         // Individual punch records
    {
      punchType: String,               // "IN" or "OUT"
      punchTime: Date                  // Full timestamp
    }
  ],
  note: String                         // Additional notes
}
```

## Employee Fields for Salary Calculation

```javascript
{
  salary: Number,                      // Monthly salary
  workHours: String,                   // Daily work hours (e.g., "8", "10")
  salaryPerHour: Number,               // Calculated from salary/workHours
  empType: String,                     // "fulltime", "parttime", "contract"
  shift: String                        // Shift information
}
```

---

## Salary Calculation Formula

### 1. **Basic Daily Salary**
```
Daily Salary = Monthly Salary / Number of Days in Month (working days)
Hourly Rate = Monthly Salary / (Working Hours × Working Days)
```

### 2. **Regular Work Salary**
```
Regular Salary = Daily Salary if (regularHours >= workHours)
OR
Regular Salary = Hourly Rate × regularHours
```

### 3. **Overtime Pay** (if applicable)
```
OT Rate = (Hourly Rate × 1.5) OR (Hourly Rate × 2) depending on policy
OT Amount = overtimeHours × OT Rate
```

### 4. **Weekend Pay** (if applicable)
```
Weekend Rate = (Hourly Rate × 2) OR (Hourly Rate × 1.5) depending on policy
Weekend Amount = weekend hours × Weekend Rate
```

### 5. **Holiday Pay** (if applicable)
```
Holiday Rate = (Hourly Rate × 2.5) OR (Hourly Rate × 3) depending on policy
Holiday Amount = holiday hours × Holiday Rate
```

### 6. **Deductions** (if applicable)
```
Total Deductions = Sum of all deductions (loans, advance, etc.)
```

### 7. **Final Salary**
```
Net Salary = (Regular Salary + OT Amount + Weekend Amount + Holiday Amount) - Deductions
```

---

## Data Extraction Examples

### Example 1: Get Monthly Attendance for an Employee

```javascript
const employeeId = "507f1f77bcf86cd799439011";
const month = 12;
const year = 2025;

const startDate = new Date(year, month - 1, 1);
const endDate = new Date(year, month, 0);

const employee = await Employee.findById(employeeId);

const monthlyAttendance = employee.attendance.filter(record => {
  const recordDate = new Date(record.date);
  return recordDate >= startDate && recordDate <= endDate;
});

// Calculate totals
const totalHours = monthlyAttendance.reduce((sum, r) => sum + r.totalHours, 0);
const totalRegularHours = monthlyAttendance.reduce((sum, r) => sum + r.regularHours, 0);
const totalOvertimeHours = monthlyAttendance.reduce((sum, r) => sum + r.overtimeHours, 0);
const totalDays = monthlyAttendance.length;

console.log({
  employeeName: employee.name,
  month,
  year,
  totalDays,
  totalHours,
  totalRegularHours,
  totalOvertimeHours
});
```

### Example 2: Calculate Salary Based on Attendance

```javascript
async function calculateMonthlySalary(employeeId, month, year) {
  const employee = await Employee.findById(employeeId);
  
  // Get monthly attendance
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const monthlyAttendance = employee.attendance.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= endDate;
  });

  // Calculate totals
  const totalRegularHours = monthlyAttendance.reduce((sum, r) => sum + r.regularHours, 0);
  const totalOvertimeHours = monthlyAttendance.reduce((sum, r) => sum + r.overtimeHours, 0);
  const totalWeekendHours = monthlyAttendance
    .filter(r => r.isWeekend)
    .reduce((sum, r) => sum + r.totalHours, 0);
  const totalHolidayHours = monthlyAttendance
    .filter(r => r.isHoliday)
    .reduce((sum, r) => sum + r.totalHours, 0);

  // Calculate rates
  const daysInMonth = endDate.getDate();
  const workingDaysInMonth = monthlyAttendance.length; // or use business days
  
  const dailyRate = employee.salary / daysInMonth;
  const hourlyRate = employee.salary / (parseInt(employee.workHours) * workingDaysInMonth);

  // Calculate components
  const regularSalary = hourlyRate * totalRegularHours;
  const overtimeSalary = hourlyRate * 1.5 * totalOvertimeHours; // 1.5x for OT
  const weekendSalary = hourlyRate * 2 * totalWeekendHours; // 2x for weekends
  const holidaySalary = hourlyRate * 2.5 * totalHolidayHours; // 2.5x for holidays

  const grossSalary = regularSalary + overtimeSalary + weekendSalary + holidaySalary;

  // Deductions
  const totalDeductions = employee.deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Net Salary
  const netSalary = grossSalary - totalDeductions;

  return {
    employee: {
      id: employee._id,
      name: employee.name,
      empId: employee.empId,
      salary: employee.salary
    },
    period: { month, year },
    attendance: {
      totalDays: monthlyAttendance.length,
      totalHours: totalRegularHours + totalOvertimeHours + totalWeekendHours + totalHolidayHours,
      totalRegularHours,
      totalOvertimeHours,
      totalWeekendHours,
      totalHolidayHours
    },
    rates: {
      dailyRate: dailyRate.toFixed(2),
      hourlyRate: hourlyRate.toFixed(2),
      overtimeRate: (hourlyRate * 1.5).toFixed(2),
      weekendRate: (hourlyRate * 2).toFixed(2),
      holidayRate: (hourlyRate * 2.5).toFixed(2)
    },
    salary: {
      regularSalary: regularSalary.toFixed(2),
      overtimeSalary: overtimeSalary.toFixed(2),
      weekendSalary: weekendSalary.toFixed(2),
      holidaySalary: holidaySalary.toFixed(2),
      grossSalary: grossSalary.toFixed(2)
    },
    deductions: {
      items: employee.deductions,
      total: totalDeductions.toFixed(2)
    },
    finalSalary: netSalary.toFixed(2)
  };
}

// Usage
const salary = await calculateMonthlySalary("507f1f77bcf86cd799439011", 12, 2025);
console.log(salary);
```

### Example 3: Get Punch-by-Punch Details

```javascript
async function getPunchDetails(employeeId, date) {
  const employee = await Employee.findById(employeeId);
  
  const dateStr = new Date(date).toISOString().slice(0, 10);
  const attendance = employee.attendance.find(a => 
    a.date.toISOString().slice(0, 10) === dateStr
  );

  if (!attendance) {
    return { success: false, message: 'No attendance record for this date' };
  }

  return {
    date: dateStr,
    employee: employee.name,
    punches: attendance.punchLogs.map((log, idx) => ({
      punchNo: idx + 1,
      type: log.punchType,
      time: log.punchTime.toLocaleTimeString('en-IN'),
      timestamp: log.punchTime
    })),
    inTime: attendance.inTime,
    outTime: attendance.outTime,
    totalHours: attendance.totalHours,
    regularHours: attendance.regularHours,
    overtimeHours: attendance.overtimeHours,
    isWeekend: attendance.isWeekend,
    isHoliday: attendance.isHoliday
  };
}

// Usage
const details = await getPunchDetails("507f1f77bcf86cd799439011", "2025-12-17");
console.log(details);
```

---

## API Endpoints for Salary Module (To Be Implemented)

### Get Monthly Attendance Summary
```
GET /api/salary/attendance-summary?employeeId={id}&month={mm}&year={yyyy}
```

Response:
```json
{
  "success": true,
  "data": {
    "employeeId": "...",
    "month": 12,
    "year": 2025,
    "totalDays": 22,
    "totalHours": 180,
    "regularHours": 176,
    "overtimeHours": 4,
    "weekendDays": 2,
    "holidayDays": 1
  }
}
```

### Calculate Salary
```
POST /api/salary/calculate
Body: {
  "employeeId": "...",
  "month": 12,
  "year": 2025
}
```

Response:
```json
{
  "success": true,
  "data": {
    "employeeId": "...",
    "month": 12,
    "year": 2025,
    "grossSalary": 25000,
    "deductions": 2500,
    "netSalary": 22500,
    "breakdown": {
      "regularSalary": 22000,
      "overtimeSalary": 1500,
      "weekendSalary": 1500,
      "holidaySalary": 0
    }
  }
}
```

### Get Payroll (Multiple Employees)
```
POST /api/salary/payroll
Body: {
  "month": 12,
  "year": 2025,
  "departmentId": "optional",
  "groupId": "optional"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "month": 12,
    "year": 2025,
    "totalEmployees": 105,
    "totalGrossSalary": 2625000,
    "totalDeductions": 262500,
    "totalNetSalary": 2362500,
    "employees": [...]
  }
}
```

---

## Important Notes for Future Development

1. **Time Format Consistency**: All times are stored in HH:mm:ss format (24-hour)
2. **Timezone**: Currently using Asia/Kolkata (IST)
3. **Duplicate Prevention**: System prevents marking attendance twice on same date
4. **Auto-Calculation**: Hours are calculated automatically on punch out
5. **Punch Logs**: Every punch (IN/OUT) is logged for audit trail
6. **Weekend Detection**: Automatically detects Sundays and Saturdays
7. **Holiday Integration**: Can link with holiday calendar for holiday pay calculation
8. **Wage Rules**: Current system supports flexible OT rates (1.5x, 2x, 2.5x)

---

## Migration Helper: Converting Old Attendance Format

If you have existing attendance records without the new fields, run this script to backfill:

```javascript
async function migrateAttendanceRecords() {
  const employees = await Employee.find();

  for (const emp of employees) {
    emp.attendance = emp.attendance.map(att => {
      const dayOfWeek = new Date(att.date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let totalHours = 0;
      let regularHours = 0;
      let overtimeHours = 0;

      if (att.inTime && att.outTime) {
        const [inH, inM] = att.inTime.split(':').map(Number);
        const [outH, outM] = att.outTime.split(':').map(Number);
        const inMin = inH * 60 + inM;
        const outMin = outH * 60 + outM;
        let diff = outMin - inMin;
        if (diff < 0) diff += 24 * 60;
        
        totalHours = parseFloat((diff / 60).toFixed(2));
        const shiftHours = emp.workHours ? parseInt(emp.workHours) : 8;
        
        regularHours = Math.min(totalHours, shiftHours);
        overtimeHours = parseFloat((Math.max(totalHours - shiftHours, 0)).toFixed(2));
      }

      return {
        ...att.toObject(),
        totalHours,
        regularHours,
        overtimeHours,
        breakMinutes: att.breakMinutes || 0,
        isWeekend,
        isHoliday: att.isHoliday || false,
        punchLogs: att.punchLogs || []
      };
    });

    await emp.save();
  }

  console.log('✅ Migration complete!');
}

// Run: migrateAttendanceRecords();
```

