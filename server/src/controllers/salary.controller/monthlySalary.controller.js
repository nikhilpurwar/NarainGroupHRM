import { asyncHandler } from '../../middleware/async.middleware.js'
import salaryService from '../../services/salary.service.js'
import Employee from '../../models/employee.model.js'
import MonthlySalaryModel from '../../models/salary.model/monthlySalary.model.js'

// Check if salary data exists for a month
export const checkMonthlySalaryExists = asyncHandler(async (req, res) => {
	const { month, year } = req.query
	
	let monthKey
	if (month && String(month).includes('-')) {
		const parts = String(month).split('-')
		monthKey = `${parts[0]}-${Number(parts[1])}`
	} else if (month && year) {
		monthKey = `${Number(year)}-${Number(month)}`
	} else {
		return res.status(400).json({ success: false, message: 'month is required' })
	}

	const exists = await MonthlySalaryModel.findOne({ monthKey }).lean()
	res.json({ 
		success: true, 
		data: { exists: !!exists, monthKey } 
	})
})

// Calculate and store monthly salary for a month
export const calculateAndStoreMonthlySalary = asyncHandler(async (req, res) => {
	const { month, year } = req.body
	
	let fromDate, toDate
	if (month && String(month).includes('-')) {
		const parts = String(month).split('-').map(s => Number(s))
		if (parts.length === 2) {
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
		fromDate = new Date(y, m, 1)
		toDate = new Date(y, m + 1, 0)
	} else {
		return res.status(400).json({ success: false, message: 'month and year are required' })
	}

	const monthKey = `${fromDate.getFullYear()}-${fromDate.getMonth() + 1}`

	// Check if already exists
	const existing = await MonthlySalaryModel.findOne({ monthKey })
	if (existing) {
		return res.json({ 
			success: true, 
			data: { exists: true, monthKey, message: 'Salary already calculated for this month' } 
		})
	}

	// Compute full report
	const report = await salaryService.computeSalaryReport({ 
		fromDate: fromDate.toISOString(), 
		toDate: toDate.toISOString(), 
		page: 1, 
		pageSize: 10000 
	})

	// Store in database
	const monthlyRecord = await MonthlySalaryModel.create({
		monthKey,
		fromDate,
		toDate,
		items: report.items || [],
		summary: report.summary || {},
		totalRecords: report.totalRecords || 0
	})

	res.json({ 
		success: true, 
		data: { 
			monthKey, 
			created: true,
			totalRecords: monthlyRecord.totalRecords,
			message: 'Monthly salary calculated and stored successfully' 
		} 
	})
})

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
	const monthKey = `${fromDate.getFullYear()}-${fromDate.getMonth() + 1}`
	res.json({ success: true, data: { ...report, monthKey, fromDate: fromDate.toISOString(), toDate: toDate.toISOString() }, message: 'Monthly salary report' })
})

export default { monthlySalaryReport, checkMonthlySalaryExists, calculateAndStoreMonthlySalary }
