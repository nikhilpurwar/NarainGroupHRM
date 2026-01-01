import MonthlySalaryModel from '../models/salary.model/monthlySalary.model.js'

/**
 * Invalidate (delete) cached monthly salary records for specific months
 * @param {Date|Date[]} dates - Date(s) to invalidate cache for
 */
export async function invalidateMonthlySalaryCache(dates) {
  try {
    const dateArray = Array.isArray(dates) ? dates : [dates]
    const monthKeys = new Set()

    for (const date of dateArray) {
      if (!date) continue
      const d = new Date(date)
      const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`
      monthKeys.add(monthKey)
    }

    if (monthKeys.size === 0) return

    const result = await MonthlySalaryModel.deleteMany({
      monthKey: { $in: Array.from(monthKeys) }
    })

    console.log(`[Cache] Invalidated ${result.deletedCount} monthly salary records for months:`, Array.from(monthKeys))
    return result
  } catch (err) {
    console.error('[Cache] Failed to invalidate monthly salary cache:', err.message)
    // Non-fatal: don't throw, just log
  }
}

/**
 * Invalidate cache for current month and optionally previous/future months
 * @param {Object} options
 * @param {boolean} options.currentMonth - Invalidate current month (default: true)
 * @param {boolean} options.previousMonth - Invalidate previous month (default: false)
 * @param {boolean} options.futureMonth - Invalidate next month (default: false)
 */
export async function invalidateCurrentMonthCache(options = {}) {
  const { currentMonth = true, previousMonth = false, futureMonth = false } = options
  const dates = []
  const now = new Date()

  if (currentMonth) dates.push(now)
  if (previousMonth) {
    const prev = new Date(now)
    prev.setMonth(prev.getMonth() - 1)
    dates.push(prev)
  }
  if (futureMonth) {
    const next = new Date(now)
    next.setMonth(next.getMonth() + 1)
    dates.push(next)
  }

  return invalidateMonthlySalaryCache(dates)
}

export default {
  invalidateMonthlySalaryCache,
  invalidateCurrentMonthCache
}
