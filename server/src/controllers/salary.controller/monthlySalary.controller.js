import { asyncHandler } from '../../middleware/async.middleware.js'
import salaryService from '../../services/salary.service.js'
import Employee from '../../models/employee.model.js'

export const monthlySalaryReport = asyncHandler(async (req, res) => {
	// Accept month & year or month in 'YYYY-M' format
	const { month, year, employeeName, page, pageSize } = req.query
	let fromDate, toDate
	if (month) {
		// support month='2025-12' or month='12' with separate year
		if (String(month).includes('-')) {
			const parts = String(month).split('-').map(s => Number(s))
			if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
				const y = parts[0]
				const m = parts[1] - 1
				fromDate = new Date(y, m, 1)
				toDate = new Date(y, m + 1, 0)
			} else {
				return res.status(400).json({ success: false, message: 'invalid month format' })
			}
		} else if (month && year) {
			const m = Number(month) - 1
			const y = Number(year)
			if (Number.isNaN(m) || Number.isNaN(y)) return res.status(400).json({ success: false, message: 'invalid month or year' })
			fromDate = new Date(y, m, 1)
			toDate = new Date(y, m + 1, 0)
		} else {
			return res.status(400).json({ success: false, message: 'month and year are required' })
		}
	} else {
		return res.status(400).json({ success: false, message: 'month is required' })
	}

	// optional employee filter
	let employeeId = null
	if (employeeName) {
		const emp = await Employee.findOne({ $or: [{ name: new RegExp(employeeName, 'i') }, { empId: new RegExp(employeeName, 'i') }] })
		if (emp) employeeId = emp._id
	}

	const report = await salaryService.computeSalaryReport({ fromDate: fromDate.toISOString(), toDate: toDate.toISOString(), employeeId, page: Number(page) || 1, pageSize: Number(pageSize) || 15 })
	res.json({ success: true, data: report, message: 'Monthly salary report' })
})

export default { monthlySalaryReport }
