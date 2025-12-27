import Attendance from '../models/attendance.model.js'
import Employee from '../models/employee.model.js'
import Advance from '../models/advance.model.js'
import SalaryRule from '../models/setting.model/salaryRule.model.js'
import { SubDepartment } from '../models/department.model.js'

/**
 * Helper: get or derive salary rule for a subDepartment
 */
export async function getSalaryRuleForSubDepartment(subDeptId) {
  if (!subDeptId) return null
  const rule = await SalaryRule.findOne({ subDepartment: subDeptId })
  if (rule) return rule
  // fallback: derive from SubDepartment name
  const sub = await SubDepartment.findById(subDeptId)
  if (!sub) return null
  const name = (sub.name || '').toLowerCase()
  // Defaults per business rules provided
  if (name.includes('head')) {
    return {
      fixedSalary: true,
      allowFestivalOT: false,
      allowDailyOT: false,
      allowSundayOT: false,
      allowNightOT: false,
      absenceDeduction: false,
      gatePassDeduction: false,
      shiftHours: 8
    }
  }
  if (name.includes('foreman')) {
    return {
      fixedSalary: true,
      allowFestivalOT: false,
      allowDailyOT: false,
      allowSundayOT: false,
      allowNightOT: true,
      absenceDeduction: false,
      gatePassDeduction: false,
      shiftHours: 8
    }
  }
  if (name.includes('management') || name.includes('management')) {
    return {
      fixedSalary: true,
      allowFestivalOT: true,
      allowDailyOT: true,
      allowSundayOT: true,
      allowNightOT: true,
      absenceDeduction: true,
      gatePassDeduction: false,
      shiftHours: 8,
      sundayAutopayRequiredLastWorkingDays: 4,
      festivalAutopayRequiredPrevDays: 2
    }
  }
  if (name.includes('general')) {
    return {
      fixedSalary: false,
      allowFestivalOT: true,
      allowDailyOT: true,
      allowSundayOT: true,
      allowNightOT: true,
      absenceDeduction: true,
      gatePassDeduction: true,
      shiftHours: 8,
      sundayAutopayRequiredLastWorkingDays: 4,
      festivalAutopayRequiredPrevDays: 2
    }
  }
  if (name.includes('driver')) {
    return {
      fixedSalary: true,
      allowFestivalOT: true,
      allowDailyOT: false,
      allowSundayOT: true,
      allowNightOT: true,
      absenceDeduction: true,
      gatePassDeduction: false,
      shiftHours: 8,
      sundayAutopayRequiredLastWorkingDays: 4,
      festivalAutopayRequiredPrevDays: 2
    }
  }
  if (name.includes('office staff')) {
    return {
      fixedSalary: false,
      allowFestivalOT: true,
      allowDailyOT: false,
      allowSundayOT: true,
      allowNightOT: true,
      absenceDeduction: true,
      gatePassDeduction: false,
      oneHolidayPerMonth: true,
      shiftHours: 8
    }
  }
  if (name.includes('senior office')) {
    return {
      fixedSalary: true,
      allowFestivalOT: false,
      allowDailyOT: false,
      allowSundayOT: false,
      allowNightOT: false,
      absenceDeduction: false,
      gatePassDeduction: false,
      shiftHours: 8
    }
  }
  if (name.includes('dressing') || name.includes('finish')) {
    return {
      fixedSalary: false,
      allowFestivalOT: true,
      allowDailyOT: true,
      allowSundayOT: true,
      allowNightOT: true,
      absenceDeduction: true,
      gatePassDeduction: true,
      shiftHours: 10
    }
  }

  // generic default
  return {
    fixedSalary: false,
    allowFestivalOT: true,
    allowDailyOT: true,
    allowSundayOT: true,
    allowNightOT: true,
    absenceDeduction: true,
    gatePassDeduction: true,
    shiftHours: 8
  }
}

function hourlyRateFromMonthlySalary(monthlySalary = 0, shiftHours = 8, workingDays = 22) {
  if (!monthlySalary) return 0
  return monthlySalary / (workingDays * shiftHours)
}

/**
 * Compute salary summary for an employee over a date range.
 * Returns { empId, empName, basicHours, otHours, basicPay, otPay, totalPay, presentDays }
 */
export async function computeSalaryForEmployee(employee, fromDate, toDate, opts = {}) {
  const rule = await getSalaryRuleForSubDepartment(employee.subDepartment && employee.subDepartment._id ? employee.subDepartment._id : employee.subDepartment)
  const shiftHours = (rule && rule.shiftHours) || 8

  const from = new Date(fromDate)
  const to = new Date(toDate)
  to.setHours(23,59,59,999)

  const atts = await Attendance.find({ employee: employee._id, date: { $gte: from, $lte: to } })

  let basicHours = 0
  let otHours = 0
  let presentDays = 0

  atts.forEach(a => {
    basicHours += (a.regularHours || 0)
    otHours += (a.overtimeHours || 0)
    if (a.status === 'present') presentDays += 1
  })

  const hourlyRate = hourlyRateFromMonthlySalary(employee.salary, shiftHours)
  const otRate = hourlyRate * 1.5

  let basicPay = 0
  let otPay = 0
  if (rule && rule.fixedSalary) {
    // For fixed salary employees, basic monthly salary is paid (do not pro-rate here)
    basicPay = employee.salary || 0
    // OT only if allowed
    if (rule.allowDailyOT || rule.allowFestivalOT || rule.allowSundayOT || rule.allowNightOT) {
      otPay = otHours * otRate
    }
  } else {
    basicPay = basicHours * hourlyRate
    otPay = otHours * otRate
  }

  const totalPay = basicPay + otPay

  // Advance / loan summary for employee
  const advances = await Advance.find({ employee: employee._id, status: 'active' })
  const advanceTotal = advances.filter(a => a.type === 'advance').reduce((s, a) => s + (a.amount || 0), 0)
  const loanPending = advances.filter(a => a.type === 'loan').reduce((s, a) => s + (a.balance || 0), 0)
  const loanReceived = advances.filter(a => a.type === 'loan').reduce((s, a) => s + (a.amount || 0), 0)
  const loanDeduct = advances.filter(a => a.type === 'loan').reduce((s, a) => s + (a.deduction || 0), 0)

  // Deductions based on employee.deductions array (if present)
  const ded = employee.deductions || []
  const tds = ded.includes('tds') ? Number((basicPay * 0.10).toFixed(2)) : 0
  const pTax = ded.includes('ptax') ? 200 : 0
  const lwf = ded.includes('lwf') ? 20 : 0
  const esi = ded.includes('esi') ? Number((basicPay * 0.0075).toFixed(2)) : 0
  const basicPF = ded.includes('pf') ? Number((basicPay * 0.12).toFixed(2)) : 0
  const otPF = ded.includes('pf') ? Number((otPay * 0.12).toFixed(2)) : 0
  const insurance = ded.includes('insurance') ? 100 : 0
  // compute aggregate deductions and net pay (include loan deduct & advances)
  const totalDeductions = Number((tds + pTax + lwf + esi + basicPF + otPF + insurance + (loanDeduct || 0) + (advanceTotal || 0)).toFixed(2))
  const netPay = Number((Number(totalPay) - totalDeductions).toFixed(2))

  // normalize output to UI-friendly field names expected by MonthlySalary.jsx
  return {
    id: employee._id,
    empId: employee.empId,
    empName: employee.name,
    headDepartment: (employee.headDepartment && typeof employee.headDepartment === 'object') ? employee.headDepartment : (employee.headDepartment ? { name: employee.headDepartment } : null),
    subDepartment: (employee.subDepartment && typeof employee.subDepartment === 'object') ? employee.subDepartment : (employee.subDepartment ? { name: employee.subDepartment } : null),
    salary: employee.salary || 0,
    salaryPerDay: Number((hourlyRate * shiftHours).toFixed(2)),
    salaryPerHour: Number(hourlyRate.toFixed(2)),
    salaryType: (rule && rule.fixedSalary) ? 'Fixed' : 'Variable',
    presentDays: presentDays,
    basicHours: Number(basicHours.toFixed(2)),
    otHours: Number(otHours.toFixed(2)),
    basicPay: Number(basicPay.toFixed(2)),
    otPay: Number(otPay.toFixed(2)),
    totalHours: Number((basicHours + otHours).toFixed(2)),
    totalPay: Number(totalPay.toFixed(2)),
    tds,
    pTax,
    lwf,
    esi,
    basicPF,
    otPF,
    insurance,
    advance: advanceTotal,
    loanPending,
    loanReceived,
    loanDeduct,
    totalDeductions,
    netPay
  }
}

/**
 * Compute report list for many employees.
 */
export async function computeSalaryReport({ fromDate, toDate, employeeId, page = 1, pageSize = 15 }) {
  const q = { status: 'active' }
  if (employeeId) q._id = employeeId
  const skip = (page - 1) * pageSize
  const employees = await Employee.find(q).populate('subDepartment').populate('headDepartment').skip(skip).limit(pageSize)
  const results = []
  for (const emp of employees) {
    const row = await computeSalaryForEmployee(emp, fromDate, toDate)
    results.push(row)
  }
  // summary - aggregate normalized fields
  const summary = results.reduce((acc, r) => {
    acc.totalPayable += Number(r.totalPay || 0)
    acc.totalOvertime += Number(r.otPay || 0)
    acc.totalEmployees += 1
    acc.totalWorkingHours += Number(r.totalHours || 0)
    acc.totalDeductions += Number(r.totalDeductions || 0)
    acc.totalNetPay += Number(r.netPay || 0)
    return acc
  }, { totalPayable: 0, totalOvertime: 0, totalEmployees: 0, totalWorkingHours: 0, totalDeductions: 0, totalNetPay: 0 })

  return { items: results, summary, totalRecords: await Employee.countDocuments(q) }
}

export default { getSalaryRuleForSubDepartment, computeSalaryForEmployee, computeSalaryReport }
