# IUDO_HRM — API & Model Field Reference

This document lists the main backend HTTP APIs and the primary model field names used by the server. Use this as a quick reference when building UI or integrations.


const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100"


## Authentication
- POST /api/auth/login
  - Request: `{ email, password }`
  - Response user fields: `name`, `email`, `role`, `token`
- POST /api/auth/register
  - Request: `{ name, email, password, role }`
- POST /api/auth/change-password
  - Request: `{ oldPassword, newPassword }`

Model: `User`
- `name`, `email`, `password`, `role` (enum: `admin`, `accounts`, `gate`)

## Employees
- GET /api/employees
- POST /api/employees
- GET /api/employees/:id
- PUT /api/employees/:id
- DELETE /api/employees/:id
- GET /api/employees/barcodes
- GET /api/employees/qrcodes
- POST /api/employees/:id/attendance
- GET /api/employees/:id/attendance

Model: `Employee`
- `name`, `fatherName`, `motherName`, `email`, `mobile`, `address`, `pincode`
- `gender`, `maritalStatus`, `salary`, `empType`, `shift`, `empId`
- `headDepartment`, `subDepartment`, `designation` (ObjectId refs)
- `status` (enum: `active`, `inactive`), `avatar`, `barcode`, `qrCode`

Notes:
- Attendance is stored in a separate `Attendance` collection and linked by `employee` id.

## Attendance
- GET /api/attendance/                -> attendance report (query: `employeeId`, `month`, `year`, `search`)
- GET /api/attendance/today           -> today's attendance (also available at `/api/attendance/attendance/today`)
- GET /api/attendance/attendance/today
- GET /api/attendance/history?days=14 -> attendance history (if available)
- GET /api/attendance/store-emp-attend (GET/POST) -> barcode scanner endpoint (public)

Model: `Attendance`
- `employee` (ObjectId ref to `Employee`), `date`, `shift`
- `status` (enum: `present`, `absent`, `halfday`, `leave`)
- `inTime`, `outTime`, `totalHours`, `regularHours`, `overtimeHours`
- OT buckets: `dayOtHours`, `nightOtHours`, `sundayOtHours`, `festivalOtHours`
- `breakMinutes`, `isWeekend`, `isHoliday`, `punchLogs` (array of `{ punchType: 'IN'|'OUT', punchTime }`)

## Salary
- GET /api/salary/daily              -> daily salary report
- GET /api/salary/monthly            -> monthly salary report (params: `month=YYYY-M` etc.)
- GET /api/salary/monthly/exists     -> check if monthly salary exists
- POST /api/salary/monthly/calculate -> calculate & store monthly salary
- PATCH /api/salary/monthly/:empId/recalculate
- PATCH /api/salary/monthly/:empId/pay

Model: `MonthlySalary`
- `monthKey` (string, e.g. `2025-12`), `fromDate`, `toDate`
- `items` (array of per-employee salary items)
- `summary` (mixed object containing totals), `totalRecords`

Model: `MonthlySummary`
- `employee` (ObjectId), `year`, `month`
- `totalPresent`, `totalAbsent`, `totalHalfday`, `totalLeave`
- `totalWorkingDays`, `totalHoursWorked`, `totalOvertimeHours`, `lastUpdated`

## Departments & Designations
- GET /api/departments/head-departments
- POST /api/departments/head-departments
- PUT /api/departments/head-departments/:id
- DELETE /api/departments/head-departments/:id
- GET /api/departments/sub-departments
- POST /api/departments/sub-departments
- GET /api/departments/designations
- POST /api/departments/designations

Models:
- `HeadDepartment`: `name`, `code`, `key`, `description`, `hod`, `reportsTo`, `hierarchy`
- `SubDepartment`: `name`, `code`, `headDepartment`, `description`, `hod`, `reportsTo`, `hierarchy`
- `Designation`: `name`, `subDepartment`, `reportsToDesignation`, `shiftHours`, `description`

## Advances (Loans/Advances)
- GET /api/advances
- GET /api/advances/:id
- POST /api/advances (multipart: `attachment` optional)
- PUT /api/advances/:id (multipart: `attachment` optional)
- DELETE /api/advances/:id
- PATCH /api/advances/:id/status

Model: `Advance`
- `employee` (ObjectId), `date`, `start_from`, `type` (`loan`|`advance`), `amount`
- `instalment`, `deduction`, `balance`, `totalInstalment`, `reason`, `attachment`, `status`

## Settings
- Permissions: stored via `Permission` model and routes under settings
  - Model: `Permission` — `route`, `label`, `allowedRoles` (array of strings)
- Holidays: `name`, `date`, `description`
- Salary rules: CRUD under `/api/salary/rules` (see `salary.route.js`)
- Working hours: `shiftHours`, `boundaryHour`, etc. (config model)

## Notes & Conventions
- API responses generally follow `{ success: boolean, data: ..., message?: ... }`.
- Many endpoints accept query params for pagination (`page`, `pageSize`) and filters.
- Attendance-related endpoints compute derived fields (e.g., `totalHoursDisplay`, OT buckets) on the server and return them in responses.
- Field name variations: frontend code contains fallbacks for fields like `salaryPerDay`, `salary_per_day`, `salaryPerHr`, `salaryPerHour`, `hourlyRate` — prefer to use the server-provided canonical fields where available.

If you'd like, I can also generate a machine-readable OpenAPI (Swagger) spec from these routes next.
