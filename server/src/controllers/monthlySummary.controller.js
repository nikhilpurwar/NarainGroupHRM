import MonthlySummary from '../models/monthlySummary.model.js'
import { apiError } from '../utils/error.util.js'

// GET /api/monthly-summary?month=YYYY-M&employeeIds=csv or repeated
export const getMonthlySummaries = async (req, res) => {
  try {
    const { month, employeeIds } = req.query
    if (!month) return res.status(400).json({ success: false, message: 'month is required' })

    let year, mon
    if (String(month).includes('-')) {
      const parts = String(month).split('-')
      year = Number(parts[0])
      mon = Number(parts[1])
    } else {
      return res.status(400).json({ success: false, message: 'month must be in YYYY-M format' })
    }

    const ids = []
    if (typeof employeeIds === 'string') {
      // CSV or single id
      employeeIds.split(',').forEach(s => { const t = s.trim(); if (t) ids.push(t) })
    } else if (Array.isArray(employeeIds)) {
      employeeIds.forEach(s => { const t = String(s).trim(); if (t) ids.push(t) })
    }

    const query = { year, month: mon }
    if (ids.length) {
      query.employee = { $in: ids }
    }

    const summaries = await MonthlySummary.find(query).lean()
    // build map employeeId -> summary fields
    const map = {}
    for (const s of summaries) {
      const empId = s.employee ? String(s.employee) : null
      map[empId] = {
        totalPresent: s.totalPresent || 0,
        totalAbsent: s.totalAbsent || 0,
        totalHalfday: s.totalHalfday || 0,
        totalWorkingDays: s.totalWorkingDays || 0
      }
    }

    res.json({ success: true, data: { map } })
  } catch (err) {
    console.error('getMonthlySummaries error', err)
    res.status(500).json(apiError('internal_error', err.message || 'Failed to fetch monthly summaries'))
  }
}

export default { getMonthlySummaries }
