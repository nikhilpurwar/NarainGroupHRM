import Attendance from '../models/attendance.model.js'
import Employee from '../models/employee.model.js'
import Advance from '../models/advance.model.js'
import SalaryRule from '../models/setting.model/salaryRule.model.js'
import { SubDepartment } from '../models/department.model.js'
import MonthlySalaryModel from '../models/salary.model/monthlySalary.model.js'
import BreakTime from '../models/setting.model/workingHours.model.js'
import Charge from '../models/setting.model/charge.model.js'

/* -------------------------------------------------------------------------- */
/*                               DEFAULT RULE                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_SALARY_RULE = {
  fixedSalary: false,
  allowFestivalOT: true,
  allowDailyOT: true,
  allowSundayOT: true,
  allowNightOT: true,
  absenceDeduction: true,
  gatePassDeduction: true,
  shiftHours: 8,
  oneHolidayPerMonth: false,
  sundayAutopayRequiredLastWorkingDays: 4,
  festivalAutopayRequiredPrevDays: 2
}

/* -------------------------------------------------------------------------- */
/*                  GET SALARY RULE FOR SUB-DEPARTMENT                         */
/* -------------------------------------------------------------------------- */

export async function getSalaryRuleForSubDepartment(subDeptId) {
  if (!subDeptId) return null

  /* 1️⃣ Try DB configured salary rule */
  const ruleFromDB = await SalaryRule
    .findOne({ subDepartment: subDeptId })
    .lean()

  if (ruleFromDB) {
    return { ...DEFAULT_SALARY_RULE, ...ruleFromDB }
  }

  /* 2️⃣ Fallback → derive from SubDepartment name */
  const subDept = await SubDepartment.findById(subDeptId)
  if (!subDept) return null

  const name = (subDept.name || '').toLowerCase()

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

  if (name.includes('management')) {
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
      ...DEFAULT_SALARY_RULE,
      fixedSalary: false
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
      shiftHours: 8
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
      ...DEFAULT_SALARY_RULE,
      shiftHours: 10
    }
  }

  /* 3️⃣ Generic fallback */
  return DEFAULT_SALARY_RULE
}

/* -------------------------------------------------------------------------- */
/*                         SALARY CALCULATION HELPERS                          */
/* -------------------------------------------------------------------------- */

function hourlyRateFromMonthlySalary(monthlySalary = 0, shiftHours = 8, workingDays = 22) {
  if (!monthlySalary) return 0
  return monthlySalary / (workingDays * shiftHours)
}

/* -------------------------------------------------------------------------- */
/*                    COMPUTE SALARY FOR SINGLE EMPLOYEE                       */
/* -------------------------------------------------------------------------- */

export async function computeSalaryForEmployee(employee, fromDate, toDate) {

  /* Resolve salary rule */
  const rule = await getSalaryRuleForSubDepartment(
    employee.subDepartment?._id || employee.subDepartment
  )

  const shiftHours = rule?.shiftHours || 8

  /* Date range */
  const from = new Date(fromDate)
  const to = new Date(toDate)
  to.setHours(23, 59, 59, 999)

  /* Attendance records */
  const attendances = await Attendance.find({
    employee: employee._id,
    date: { $gte: from, $lte: to }
  })

  /* Aggregate attendance */
  let basicHours = 0
  let otHours = 0
  let presentDays = 0

  attendances.forEach(a => {
    basicHours += a.regularHours || 0
    otHours += a.overtimeHours || 0
    if (a.status === 'present') presentDays++
  })

  /* Rates */
  const hourlyRate = hourlyRateFromMonthlySalary(employee.salary, shiftHours)
  const otRate = hourlyRate * 1.5

  /* Daily/hour fallback values */
  const salaryPerDay = employee.salary ? +(employee.salary / 30).toFixed(2) : 0
  const salaryPerHour = salaryPerDay ? +(salaryPerDay / shiftHours).toFixed(2) : 0

  /* Salary calculation */
  let basicPay = 0
  let otPay = 0

  if (rule?.fixedSalary) {
    basicPay = employee.salary || 0
    if (
      rule.allowDailyOT ||
      rule.allowFestivalOT ||
      rule.allowSundayOT ||
      rule.allowNightOT
    ) {
      otPay = otHours * otRate
    }
  } else {
    basicPay = basicHours * hourlyRate
    otPay = otHours * otRate
  }

  const totalPay = basicPay + otPay

  /* ------------------------------------------------------------------------ */
  /*                         ADVANCE / LOAN DETAILS                            */
  /* ------------------------------------------------------------------------ */

  const advances = await Advance.find({
    employee: employee._id,
    status: 'active'
  })

  const advanceTotal = advances
    .filter(a => a.type === 'advance')
    .reduce((s, a) => s + (a.amount || 0), 0)

  const loanData = advances.filter(a => a.type === 'loan')

  // Helper: count installments paid up to a date (inclusive) based on loan.start_from
  const installmentsPaidUpTo = (loan, date) => {
    if (!loan.start_from) return 0
    const start = new Date(loan.start_from)
    const d = new Date(date)
    if (d < start) return 0
    const months = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth()) + 1
    const totalInst = loan.instalment || 1
    return Math.min(months, totalInst)
  }

  // Helper: installments paid strictly before a date (used to compute installments within range)
  const installmentsPaidBefore = (loan, date) => {
    const prev = new Date(date)
    prev.setDate(1)
    prev.setHours(0, 0, 0, 0)
    prev.setDate(prev.getDate() - 1)
    return installmentsPaidUpTo(loan, prev)
  }

  // For reporting range, compute cumulative received up to `to` and scheduled deduct for this period
  let loanPending = 0
  let loanReceived = 0
  let loanDeduct = 0 // scheduled deduction for the reporting period

  for (const l of loanData) {
    const principal = l.amount || 0
    const instalments = l.instalment || 1
    const installmentAmount = +(principal / instalments).toFixed(2)

    const paidUpToToDate = installmentsPaidUpTo(l, to)
    const paidBeforeFrom = installmentsPaidBefore(l, from)
    const installmentsInRange = Math.max(0, paidUpToToDate - paidBeforeFrom)

    const cumulativePaid = paidUpToToDate * installmentAmount
    const scheduledThisPeriod = installmentsInRange * installmentAmount

    loanReceived += cumulativePaid
    loanDeduct += scheduledThisPeriod
    // pending is remaining principal after cumulative paid
    loanPending += Math.max(0, principal - cumulativePaid)
  }

  /* ------------------------------------------------------------------------ */
  /*                              DEDUCTIONS                                   */
  /* ------------------------------------------------------------------------ */

  const ded = employee.deductions || []

  // Fetch active charges from database
  const charges = await Charge.find({ status: 1 }).lean()
  
  // Helper function to calculate deduction amount
  const calculateDeduction = (chargeName, baseAmount) => {
    const charge = charges.find(c => c.deduction.toLowerCase() === chargeName.toLowerCase())
    if (!charge) return 0
    
    if (charge.value_type === 'Percentage') {
      return +((baseAmount * charge.value) / 100).toFixed(2)
    } else {
      return +(charge.value).toFixed(2)
    }
  }

  // Apply deductions only if employee has them enabled
  const tds = ded.includes('tds') ? calculateDeduction('tds', basicPay) : 0
  const pTax = ded.includes('ptax') ? calculateDeduction('ptax', basicPay) : 0
  const lwf = ded.includes('lwf') ? calculateDeduction('lwf', basicPay) : 0
  const esi = ded.includes('esi') ? calculateDeduction('esi', basicPay) : 0
  const basicPF = ded.includes('pf') ? calculateDeduction('pf', basicPay) : 0
  const otPF = ded.includes('pf') ? calculateDeduction('pf', otPay) : 0
  const insurance = ded.includes('insurance') ? calculateDeduction('insurance', basicPay) : 0

  const totalDeductions = +(
    tds + pTax + lwf + esi + basicPF + otPF + insurance + loanDeduct + advanceTotal
  ).toFixed(2)

  const netPay = +(totalPay - totalDeductions).toFixed(2)

  /* ------------------------------------------------------------------------ */
  /*                             UI FRIENDLY OUTPUT                            */
  /* ------------------------------------------------------------------------ */

  return {
    id: employee._id,
    empId: employee.empId,
    empName: employee.name,
    headDepartment: employee.headDepartment,
    subDepartment: employee.subDepartment,
    salary: employee.salary || 0,

    salaryPerDay,
    salaryPerHour,
    salaryPerHr: +hourlyRate.toFixed(2),

    salaryType: rule?.fixedSalary ? 'Fixed' : 'Variable',

    presentDays,
    present: presentDays,

    basicHours: +basicHours.toFixed(2),
    otHours: +otHours.toFixed(2),
    workingHrs: +basicHours.toFixed(2),
    overtimeHrs: +otHours.toFixed(2),

    basicPay: +basicPay.toFixed(2),
    otPay: +otPay.toFixed(2),
    overtimePayable: +otPay.toFixed(2),

    totalHours: +(basicHours + otHours).toFixed(2),
    totalWorkingHrs: +(basicHours + otHours).toFixed(2),

    totalPay: +totalPay.toFixed(2),
    payableAmount: +totalPay.toFixed(2),

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
    netPay,

    department: employee.headDepartment?.name || '',
    group: employee.subDepartment?.name || ''
  }
}

/* -------------------------------------------------------------------------- */
/*                      COMPUTE SALARY REPORT (PAGINATED)                     */
/* -------------------------------------------------------------------------- */

export async function computeSalaryReport({ fromDate, toDate, employeeId, page = 1, pageSize = 15 }) {
  const query = { status: 'active' }
  if (employeeId) query._id = employeeId

  const skip = (page - 1) * pageSize

  const from = new Date(fromDate)
  const to = new Date(toDate)
  const monthStart = new Date(from.getFullYear(), from.getMonth(), 1)
  const monthEnd = new Date(from.getFullYear(), from.getMonth() + 1, 0)
  const isFullMonth = from.getTime() === monthStart.getTime() && to.getDate() === monthEnd.getDate()

  // If the requested range covers an entire calendar month, attempt to read cached report
  if (isFullMonth) {
    const monthKey = `${from.getFullYear()}-${from.getMonth() + 1}`
    const cached = await MonthlySalaryModel.findOne({ monthKey }).lean()
    if (cached) {
      // Return cached slice with pagination
      const start = skip
      const pageItems = (cached.items || []).slice(start, start + pageSize)
      return { items: pageItems, summary: cached.summary || {}, totalRecords: cached.totalRecords || (cached.items || []).length }
    }
  }

  // If not a full month request or no cache exists, compute on the fly
  const employees = await Employee.find(query)
    .populate('subDepartment')
    .populate('headDepartment')
    .skip(skip)
    .limit(pageSize)

  const items = []

  for (const emp of employees) {
    items.push(await computeSalaryForEmployee(emp, fromDate, toDate))
  }

  /* Summary aggregation */
  const summary = items.reduce((acc, r) => {
    acc.totalPayable += r.totalPay || 0
    acc.totalOvertime += r.otPay || 0
    acc.totalEmployees++
    acc.totalWorkingHours += r.totalHours || 0
    acc.totalDeductions += r.totalDeductions || 0
    acc.totalNetPay += r.netPay || 0
    return acc
  }, {
    totalPayable: 0,
    totalOvertime: 0,
    totalEmployees: 0,
    totalWorkingHours: 0,
    totalDeductions: 0,
    totalNetPay: 0
  })

  return {
    items,
    summary,
    totalRecords: await Employee.countDocuments(query)
  }
}

export default {
  getSalaryRuleForSubDepartment,
  computeSalaryForEmployee,
  computeSalaryReport
}
