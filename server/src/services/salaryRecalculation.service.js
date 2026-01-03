import Employee from '../models/employee.model.js'
import Attendance from '../models/attendance.model.js'
import Advance from '../models/advance.model.js'
import SalaryRule from '../models/setting.model/salaryRule.model.js'
import MonthlySalaryModel from '../models/salary.model/monthlySalary.model.js'
import salaryService from './salary.service.js'
import Charge from '../models/setting.model/charge.model.js'

/**
 * Recalculate and update salary for a specific month
 * This is called after every operation that affects salary
 * @param {Date} date - Any date in the month to recalculate
 */
export async function recalculateAndUpdateMonthlySalary(date = new Date()) {
  try {
    const d = new Date(date)
    const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`
    
    console.log(`[Salary Recalc] Starting recalculation for ${monthKey}`)

    // Get date range for the month
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)

    // Load any existing monthly record so we can preserve status/note
    const existing = await MonthlySalaryModel.findOne({ monthKey }).lean()

    const statusMap = new Map()
    if (existing && Array.isArray(existing.items)) {
      for (const it of existing.items) {
        const key = String(it.empId || it.id || it._id || '')
        if (!key) continue
        statusMap.set(key, {
          status: it.status,
          note: it.note
        })
      }
    }

    // Compute salary for all active employees
    const report = await salaryService.computeSalaryReport({
      fromDate: monthStart.toISOString(),
      toDate: monthEnd.toISOString(),
      page: 1,
      pageSize: 10000,
      useCache: false // always recompute from live data when rebuilding monthly salaries
    })

    // Merge back any existing status/note so Mark as Paid persists across recalculations
    const mergedItems = (report.items || []).map((it) => {
      const key = String(it.empId || it.id || it._id || '')
      const prev = statusMap.get(key)
      return {
        ...it,
        status: prev?.status || it.status || 'Calculated',
        note: prev?.note || it.note || ''
      }
    })

    // Update or create the monthly salary record
    const result = await MonthlySalaryModel.findOneAndUpdate(
      { monthKey },
      {
        monthKey,
        fromDate: monthStart,
        toDate: monthEnd,
        items: mergedItems,
        summary: report.summary || {},
        totalRecords: report.totalRecords || 0,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    )

    console.log(`[Salary Recalc] Successfully updated ${monthKey} with ${result.totalRecords} employees`)
    return result
  } catch (err) {
    console.error('[Salary Recalc] Error:', err.message)
    throw err
  }
}

/**
 * Recalculate and update salary for current and previous month
 * Used when immediate operations happen (punch in/out)
 */
export async function recalculateCurrentAndPreviousMonth() {
  const now = new Date()
  const prev = new Date(now)
  prev.setMonth(prev.getMonth() - 1)

  try {
    await Promise.all([
      recalculateAndUpdateMonthlySalary(now),
      recalculateAndUpdateMonthlySalary(prev)
    ])
  } catch (err) {
    console.error('[Salary Recalc] Batch update failed:', err.message)
    // Don't throw, log and continue
  }
}

export default {
  recalculateAndUpdateMonthlySalary,
  recalculateCurrentAndPreviousMonth
}
