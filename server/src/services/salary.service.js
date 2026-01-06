import Attendance from '../models/attendance.model.js'
import Employee from '../models/employee.model.js'
import Advance from '../models/advance.model.js'
import SalaryRule from '../models/setting.model/salaryRule.model.js'
import { SubDepartment } from '../models/department.model.js'
import MonthlySalaryModel from '../models/salary.model/monthlySalary.model.js'
import BreakTime from '../models/setting.model/workingHours.model.js'
import Charge from '../models/setting.model/charge.model.js'
import Holiday from '../models/setting.model/holidays.model.js'
import { computeTotalsFromPunchLogs } from './attendance.service.js'

/* -------------------------------------------------------------------------- */
/*                               DEFAULT RULE                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_SALARY_RULE = {
  fixedSalary: false,
  allowFestivalOT: true,
  allowDayOT: true,
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
      allowDayOT: false,
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
      allowDayOT: false,
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
      allowDayOT: true,
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
      allowDayOT: false,
      allowSundayOT: true,
      allowNightOT: true,
      absenceDeduction: true,
      gatePassDeduction: false,
      shiftHours: 8
    }
  }

  if (name.includes('office staff')) {
    return {
      ...DEFAULT_SALARY_RULE,
      fixedSalary: false,
      allowDayOT: false,
      oneHolidayPerMonth: true,
      shiftHours: 8
    }
  }

  if (name.includes('senior office')) {
    return {
      fixedSalary: true,
      allowFestivalOT: false,
      allowDayOT: false,
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
/*                    COMPUTE SALARY FOR SINGLE EMPLOYEE                       */
/* -------------------------------------------------------------------------- */

export async function computeSalaryForEmployee(employee, fromDate, toDate) {

  /* Resolve salary rule */
  const rule = await getSalaryRuleForSubDepartment(
    employee.subDepartment?._id || employee.subDepartment
  )
  const empType = employee.empType || ''

  // Detect special Sunday rules for specific sub-departments
  const subDeptName = (employee.subDepartment && typeof employee.subDepartment === 'object'
    ? (employee.subDepartment.name || '')
    : (rule?.name || '')
  ).toLowerCase()
  const isDressingSubDept = subDeptName.includes('dressing')

  // Derive shift hours dynamically, preferring employee.shift when present
  let shiftHours = 0
  if (employee.shift) {
    const text = String(employee.shift)
    const match = text.match(/(\d+(?:\.\d+)?)/) // extract first number like "10" or "8.5"
    if (match) {
      const parsed = Number(match[1])
      if (!Number.isNaN(parsed) && parsed > 0) {
        shiftHours = parsed
      }
    }
  }

  // If no usable value from employee.shift, fall back to rule.shiftHours or default 8
  if (!shiftHours) {
    if (rule?.shiftHours && Number(rule.shiftHours) > 0) {
      shiftHours = Number(rule.shiftHours)
    } else {
      shiftHours = 8
    }
  }

  /* Date range */
  const from = new Date(fromDate)
  const to = new Date(toDate)
  to.setHours(23, 59, 59, 999)

  // Days in the reporting period (used for monthly salary proration)
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const daysInPeriod = Math.max(1, Math.round((to - from) / MS_PER_DAY))

  /* Attendance records */
  const attendances = await Attendance.find({
    employee: employee._id,
    date: { $gte: from, $lte: to }
  })

  // For Sunday and festival autopay we may need to inspect days
  // immediately before `from` (e.g. last days of previous month).
  // Look back up to max(N) working days plus a small buffer.
  const requiredLastWorking = (
    typeof rule?.sundayAutopayRequiredLastWorkingDays === 'number'
      ? rule.sundayAutopayRequiredLastWorkingDays
      : DEFAULT_SALARY_RULE.sundayAutopayRequiredLastWorkingDays
  ) || 0
  const requiredFestivalPrev = (
    typeof rule?.festivalAutopayRequiredPrevDays === 'number'
      ? rule.festivalAutopayRequiredPrevDays
      : DEFAULT_SALARY_RULE.festivalAutopayRequiredPrevDays
  ) || 0

  const baseLookback = Math.max(requiredLastWorking, requiredFestivalPrev)
  const lookbackDays = baseLookback > 0 ? (baseLookback + 7) : 0
  let extraAttendances = []
  let fromLookback = null
  if (lookbackDays > 0) {
    fromLookback = new Date(from)
    fromLookback.setDate(fromLookback.getDate() - lookbackDays)
    extraAttendances = await Attendance.find({
      employee: employee._id,
      date: { $gte: fromLookback, $lt: from }
    })
  }

  const allAttendances = [...extraAttendances, ...attendances]

  // Use LOCAL calendar date (YYYY-MM-DD) as key to avoid
  // timezone/UTC off-by-one issues when matching dates.
  const toLocalDateKey = (d) => {
    if (!(d instanceof Date)) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const attendanceByIso = new Map()
  for (const a of allAttendances) {
    if (!a || !a.date) continue
    const d = (a.date instanceof Date) ? a.date : new Date(a.date)
    const key = toLocalDateKey(d)
    if (!key) continue
    attendanceByIso.set(key, a)
  }

  /* Sunday autopay calculation (hours only used for pay, not frontend basicHours) */
  let sundayAutopayDays = 0
  // Generic Sunday autopay (last N working days) applies to all
  // non-fixed-salary employees EXCEPT Dressing, which has its
  // own mandatory Sunday rule handled separately below.
  if (!rule?.fixedSalary && requiredLastWorking > 0 && !isDressingSubDept) {
    const cursor = new Date(from)
    cursor.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(0, 0, 0, 0)

    while (cursor <= end) {
      const dow = cursor.getDay()
      if (dow === 0) { // Sunday (autopay candidate)
        let workingCount = 0
        let allWorkingPresent = true

        const back = new Date(cursor)

        // Rule: use the last N consecutive calendar days
        // immediately before this Sunday. Each of those
        // days must have attendance status present or
        // halfday.
        const minDate = extraAttendances.length > 0 && fromLookback
          ? fromLookback
          : null

        for (let i = 0; i < requiredLastWorking; i++) {
          back.setDate(back.getDate() - 1)

          if (minDate && back < minDate) {
            allWorkingPresent = false
            break
          }

          const key = toLocalDateKey(back)
          const att = attendanceByIso.get(key)
          const status = att?.status || ''
          const st = String(status).toLowerCase()
          if (!(st === 'present' || st === 'halfday')) {
            allWorkingPresent = false
            break
          }

          workingCount++
        }

        if (workingCount >= requiredLastWorking && allWorkingPresent) {
          sundayAutopayDays++
        }
      }

      cursor.setDate(cursor.getDate() + 1)
    }
  }

  // Sunday autopay for Dressing sub-department:
  // Sunday work is mandatory for 2 Sundays; any remaining
  // Sundays in the month are auto-paid as long as the
  // employee has worked at least 2 Sundays.
  if (!rule?.fixedSalary && isDressingSubDept) {
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(0, 0, 0, 0)

    let totalSundays = 0
    let sundaysPresent = 0

    const dayCursor = new Date(start)
    while (dayCursor <= end) {
      if (dayCursor.getDay() === 0) {
        totalSundays++
        const key = toLocalDateKey(dayCursor)
        const att = attendanceByIso.get(key)
        const status = att?.status || ''
        const st = String(status).toLowerCase()
        if (st === 'present' || st === 'halfday') {
          sundaysPresent++
        }
      }
      dayCursor.setDate(dayCursor.getDate() + 1)
    }

    const mandatorySundays = 2
    if (totalSundays > mandatorySundays && sundaysPresent >= mandatorySundays) {
      sundayAutopayDays = totalSundays - mandatorySundays
    } else {
      sundayAutopayDays = 0
    }
  }

  /* Festival autopay calculation (similar consecutive-day rule) */
  let festivalAutopayDays = 0
  if (!rule?.fixedSalary && requiredFestivalPrev > 0) {
    const holidays = await Holiday.find({
      date: { $gte: from, $lte: to }
    }).lean()

    for (const h of holidays) {
      if (!h || !h.date) continue

      const fest = new Date(h.date)
      fest.setHours(0, 0, 0, 0)

      let allPrevPresent = true
      let count = 0
      const back = new Date(fest)

      const minDate = extraAttendances.length > 0 && fromLookback
        ? fromLookback
        : null

      for (let i = 0; i < requiredFestivalPrev; i++) {
        back.setDate(back.getDate() - 1)

        if (minDate && back < minDate) {
          allPrevPresent = false
          break
        }

        const key = toLocalDateKey(back)
        const att = attendanceByIso.get(key)
        const status = att?.status || ''
        const st = String(status).toLowerCase()

        if (!(st === 'present' || st === 'halfday')) {
          allPrevPresent = false
          break
        }

        count++
      }

      if (count >= requiredFestivalPrev && allPrevPresent) {
        festivalAutopayDays++
      }
    }
  }

  /* Aggregate attendance */
  let basicHours = 0
  let presentDays = 0

  // Track OT by type so SalaryRule flags can be applied strictly
  // Prefer per-day buckets stored on Attendance; fall back to recomputation if missing.
  let dayOtHours = 0          // OT on normal working days (daytime)
  let nightOtHours = 0        // OT during night window on normal days
  let sundayOtHours = 0       // OT on weekends (Sunday/Saturday)
  let festivalOtHours = 0     // OT on holidays

  attendances.forEach((a) => {
    let regular = a.regularHours || 0
    let overtime = a.overtimeHours || 0

    let dayBucket = a.dayOtHours || 0
    let nightBucket = a.nightOtHours || 0
    let sundayBucket = a.sundayOtHours || 0
    let festivalBucket = a.festivalOtHours || 0

    // If punch logs exist and buckets are missing (older data), recompute live
    if (Array.isArray(a.punchLogs) && a.punchLogs.length > 0) {
      const totals = computeTotalsFromPunchLogs(
        a.punchLogs,
        shiftHours,
        { countOpenAsNow: true, dayMeta: { isWeekend: a.isWeekend, isHoliday: a.isHoliday } }
      )
      regular = totals.regularHours
      overtime = totals.overtimeHours

      if (!a.dayOtHours && !a.nightOtHours && !a.sundayOtHours && !a.festivalOtHours) {
        dayBucket = totals.dayOtHours
        nightBucket = totals.nightOtHours
        sundayBucket = totals.sundayOtHours
        festivalBucket = totals.festivalOtHours
      }
    }

    basicHours += regular

    if (dayBucket || nightBucket || sundayBucket || festivalBucket) {
      dayOtHours += dayBucket
      nightOtHours += nightBucket
      sundayOtHours += sundayBucket
      festivalOtHours += festivalBucket
    } else if (overtime > 0) {
      // Fallback for legacy records without buckets
      if (a.isHoliday) {
        festivalOtHours += overtime
      } else if (a.isWeekend) {
        sundayOtHours += overtime
      } else {
        dayOtHours += overtime
      }
    }

    if (a.status === 'present') presentDays++
  })

  // Apply OT rules strictly from SalaryRule
  const payableOtHours =
    (rule?.allowDayOT ? dayOtHours : 0) +
    (rule?.allowNightOT ? nightOtHours : 0) +
    (rule?.allowSundayOT ? sundayOtHours : 0) +
    (rule?.allowFestivalOT ? festivalOtHours : 0)

  const otHours = payableOtHours

  /* Rates */
  let hourlyRate = 0
  let salaryPerDay = 0
  let salaryPerHour = 0

  if (empType === 'Daily Salary') {
    // For daily salary employees, `employee.salary` is treated as per-day
    salaryPerDay = employee.salary || 0
  } else {
    // For monthly salary employees, divide by number of days in the period
    salaryPerDay = employee.salary ? +(employee.salary / daysInPeriod).toFixed(2) : 0
  }

  salaryPerHour = shiftHours ? +(salaryPerDay / shiftHours).toFixed(2) : 0
  hourlyRate = salaryPerHour

  // Overtime rate is 1.0x the normal hourly rate (can be adjusted by policy)
  const otRate = hourlyRate * 1

  /* Salary calculation */
  let basicPay = 0
  let otPay = 0
  const sundayAutopayHours = sundayAutopayDays * shiftHours
  const sundayAutopayPay = +(sundayAutopayHours * hourlyRate).toFixed(2)
  const festivalAutopayHours = festivalAutopayDays * shiftHours
  const festivalAutopayPay = +(festivalAutopayHours * hourlyRate).toFixed(2)

  if (rule?.fixedSalary) {
    // Fixed salary employees: basic pay is monthly salary only,
    // OT is paid strictly based on allowed OT types above.
    basicPay = employee.salary || 0
  } else {
    // For variable salary employees, add Sunday autopay on top of
    // worked-hour basic pay. We keep basicHours (frontend) based only
    // on actual attendance; autopay hours are not merged into
    // basicHours so hours display stays separate.
    basicPay = basicHours * hourlyRate + sundayAutopayPay + festivalAutopayPay
  }

  // OT pay always computed from payable OT hours dictated by rules
  otPay = otHours * otRate

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

  // Normalize employee deductions to lowercase strings (e.g., 'TDS' -> 'tds')
  const ded = (employee.deductions || [])
    .filter(Boolean)
    .map(d => String(d).toLowerCase())

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
    empType,
    headDepartment: employee.headDepartment,
    subDepartment: employee.subDepartment,
    salary: employee.salary || 0,
    
    shiftHours,
    salaryPerDay,
    salaryPerHour,
    salaryPerHr: +hourlyRate.toFixed(2),

    salaryType: rule?.fixedSalary ? 'Fixed' : 'Variable',

  // Expose OT allowance flags so frontend can show which
  // OT buckets are actually payable vs just worked.
  allowDayOT: !!(rule && rule.allowDayOT),
  allowNightOT: !!(rule && rule.allowNightOT),
  allowSundayOT: !!(rule && rule.allowSundayOT),
  allowFestivalOT: !!(rule && rule.allowFestivalOT),

    presentDays,
    present: presentDays,

    basicHours: +basicHours.toFixed(2),
    otHours: +otHours.toFixed(2),
    // Detailed OT buckets (hours)
    dayOtHours: +dayOtHours.toFixed(2),
    nightOtHours: +nightOtHours.toFixed(2),
    sundayOtHours: +sundayOtHours.toFixed(2),
    festivalOtHours: +festivalOtHours.toFixed(2),
    workingHrs: +basicHours.toFixed(2),
    overtimeHrs: +otHours.toFixed(2),

    sundayAutopayDays,
    sundayAutopayHours,
    sundayAutopayPay,

    festivalAutopayDays,
    festivalAutopayHours,
    festivalAutopayPay,

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

    // Payment status (can be updated later via pay endpoint)
    status: 'Calculated',

    department: employee.headDepartment?.name || '',
    group: employee.subDepartment?.name || ''
  }
}

/* -------------------------------------------------------------------------- */
/*                      COMPUTE SALARY REPORT (PAGINATED)                     */
/* -------------------------------------------------------------------------- */

export async function computeSalaryReport({ fromDate, toDate, employeeId, page = 1, pageSize = 15, useCache = true }) {
  const query = { status: 'active' }
  if (employeeId) query._id = employeeId

  const skip = (page - 1) * pageSize

  const from = new Date(fromDate)
  const to = new Date(toDate)
  const monthStart = new Date(from.getFullYear(), from.getMonth(), 1)
  const monthEnd = new Date(from.getFullYear(), from.getMonth() + 1, 0)
  const isFullMonth = from.getTime() === monthStart.getTime() && to.getDate() === monthEnd.getDate()

  // If the requested range covers an entire calendar month, attempt to read cached report
  if (isFullMonth && useCache) {
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
