import { asyncHandler } from '../../middleware/async.middleware.js'
import salaryService from '../../services/salary.service.js'
import salaryRecalcService from '../../services/salaryRecalculation.service.js'
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
	const { month, year, forceRecalculate } = req.body
	
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
	if (existing && !forceRecalculate) {
		return res.json({ 
			success: true, 
			data: { 
				exists: true, 
				monthKey, 
				message: 'Salary already calculated for this month. Pass forceRecalculate=true to refresh with latest rules.' 
			} 
		})
	}

	// Recalculate and update using the service (creates or refreshes record)
	const result = await salaryRecalcService.recalculateAndUpdateMonthlySalary(fromDate)

	res.json({ 
		success: true, 
		data: { 
			monthKey, 
			created: !existing,
			totalRecords: result.totalRecords,
			message: existing
				? 'Monthly salary recalculated and stored successfully'
				: 'Monthly salary calculated and stored successfully' 
		} 
	})
})

export const monthlySalaryReport = asyncHandler(async (req, res) => {
	// Accept month & year or month in 'YYYY-M' format
	const { month, year, employeeName, subDepartment, page, pageSize } = req.query
	let monthKey
	
	// Parse month parameter
	if (month) {
		if (String(month).includes('-')) {
			const parts = String(month).split('-')
			monthKey = `${parts[0]}-${Number(parts[1])}`
		} else if (month && year) {
			monthKey = `${Number(year)}-${Number(month)}`
		} else {
			return res.status(400).json({ success: false, message: 'month is required' })
		}
	} else {
		return res.status(400).json({ success: false, message: 'month is required' })
	}

	// Get cached salary data from MonthlySalaryModel
	const cached = await MonthlySalaryModel.findOne({ monthKey }).lean()

	if (!cached) {
		// No cached data for this month - return empty
		return res.json({
			success: true,
			data: {
				items: [],
				summary: {},
				totalRecords: 0,
				monthKey,
				message: 'No salary data calculated for this month yet'
			}
		})
	}

	// Apply optional filters
	let items = cached.items || []
	if (employeeName) {
		items = items.filter(item =>
			item.empName.toLowerCase().includes(employeeName.toLowerCase()) ||
			item.empId.toLowerCase().includes(employeeName.toLowerCase())
		)
	}

	// Optional sub-department filter (by subDepartment id)
	if (subDepartment) {
		const subId = String(subDepartment)
		items = items.filter(item => {
			const raw = item.subDepartment
			const itemId = raw && raw._id ? String(raw._id) : (raw ? String(raw) : '')
			return itemId === subId
		})
	}

	// Apply pagination
	const p = Number(page) || 1
	const ps = Number(pageSize) || 15
	const skip = (p - 1) * ps
	const paginatedItems = items.slice(skip, skip + ps)

	// Calculate summary for all filtered items (not just current page)
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

	res.json({
		success: true,
		data: {
			items: paginatedItems,
			summary,
			totalRecords: items.length,
			monthKey,
			fromDate: cached.fromDate,
			toDate: cached.toDate
		}
	})
})

// Recalculate salary for a specific employee when loan deduction changes
export const recalculateSalaryForEmployee = asyncHandler(async (req, res) => {
	const { empId } = req.params
	const { loanDeduct, month } = req.body

	if (!month) {
		return res.status(400).json({ success: false, message: 'month is required' })
	}

	// Parse month to get date range
	let fromDate, toDate
	if (String(month).includes('-')) {
		const parts = String(month).split('-').map(s => Number(s))
		if (parts.length === 2) {
			const y = parts[0]
			const m = parts[1] - 1
			fromDate = new Date(y, m, 1)
			toDate = new Date(y, m + 1, 0)
		} else {
			return res.status(400).json({ success: false, message: 'invalid month format' })
		}
	} else {
		return res.status(400).json({ success: false, message: 'invalid month format' })
	}

	const monthKey = `${fromDate.getFullYear()}-${fromDate.getMonth() + 1}`

	// Find the employee
	const employee = await Employee.findOne({ empId })
	if (!employee) {
		return res.status(404).json({ success: false, message: 'Employee not found' })
	}

	// If employee is active, compute salary from live data. If inactive, try to use stored monthly record.
	let salaryItem = null
	if (employee.status && employee.status.toString().toLowerCase() === 'active') {
		const report = await salaryService.computeSalaryReport({ 
			fromDate: fromDate.toISOString(), 
			toDate: toDate.toISOString(), 
			employeeId: employee._id,
			page: 1,
			pageSize: 1,
			useCache: false
		})

		if (!report.items || report.items.length === 0) {
			return res.status(404).json({ success: false, message: 'No salary data found for this employee' })
		}

		salaryItem = report.items[0]
	} else {
		// Inactive employee: use stored monthly salary item if available
		const monthKey = `${fromDate.getFullYear()}-${fromDate.getMonth() + 1}`
		const monthlyRecord = await MonthlySalaryModel.findOne({ monthKey }).lean()
		if (!monthlyRecord || !Array.isArray(monthlyRecord.items)) {
			return res.status(404).json({ success: false, message: 'No salary data found for this employee (inactive)' })
		}
		const item = monthlyRecord.items.find(it => String(it.empId) === String(empId) || String(it.id) === String(employee._id) || String(it._id) === String(employee._id))
		if (!item) {
			return res.status(404).json({ success: false, message: 'No salary data found for this employee (inactive)' })
		}
		salaryItem = item
	}
	
	// Update with new loan deduction
	const newLoanDeduct = Number(loanDeduct) || 0
	const oldLoanDeduct = salaryItem.loanDeduct || 0
	const loanDiff = newLoanDeduct - oldLoanDeduct

	// Recalculate totals
	const newTotalDeductions = (salaryItem.totalDeductions || 0) + loanDiff
	const newNetPay = (salaryItem.netPay || 0) - loanDiff

	// Update in the stored monthly record
	const monthlyRecord = await MonthlySalaryModel.findOne({ monthKey })
	if (monthlyRecord) {
		const itemIndex = monthlyRecord.items.findIndex(item => item.empId === empId)
		if (itemIndex !== -1) {
			monthlyRecord.items[itemIndex].loanDeduct = newLoanDeduct
			monthlyRecord.items[itemIndex].totalDeductions = newTotalDeductions
			monthlyRecord.items[itemIndex].netPay = newNetPay
			monthlyRecord.markModified('items')
			await monthlyRecord.save()
		}
	}

	res.json({
		success: true,
		data: {
			loanDeduct: newLoanDeduct,
			totalDeductions: newTotalDeductions,
			netPay: newNetPay
		},
		message: 'Salary recalculated successfully'
	})
})

// Mark monthly salary as paid (with optional note) for an employee
export const markSalaryAsPaid = asyncHandler(async (req, res) => {
	const { empId } = req.params
	const { month, note, status } = req.body

	if (!month) {
		return res.status(400).json({ success: false, message: 'month is required' })
	}

	// Parse month to get monthKey (supports 'YYYY-M' format only, matching recalc logic)
	let fromDate
	if (String(month).includes('-')) {
		const parts = String(month).split('-').map(s => Number(s))
		if (parts.length === 2) {
			const y = parts[0]
			const m = parts[1] - 1
			fromDate = new Date(y, m, 1)
		} else {
			return res.status(400).json({ success: false, message: 'invalid month format' })
		}
	} else {
		return res.status(400).json({ success: false, message: 'invalid month format' })
	}

	const monthKey = `${fromDate.getFullYear()}-${fromDate.getMonth() + 1}`

	// Find stored monthly salary record
	const monthlyRecord = await MonthlySalaryModel.findOne({ monthKey })
	if (!monthlyRecord) {
		return res.status(404).json({ success: false, message: 'No salary data found for this month' })
	}

	// Try to resolve employee _id so we can match on multiple possible fields
	const employee = await Employee.findOne({ empId })
	const employeeIdStr = employee ? String(employee._id) : null

	// Try several ways to locate the salary item for this employee
	const itemIndex = monthlyRecord.items.findIndex((item) => {
		const itemEmpId = item.empId ? String(item.empId) : ''
		const itemId = item.id ? String(item.id) : ''
		const itemMongoId = item._id ? String(item._id) : ''
		if (itemEmpId && itemEmpId === String(empId)) return true
		if (employeeIdStr && (itemId === employeeIdStr || itemMongoId === employeeIdStr)) return true
		return false
	})
	if (itemIndex === -1) {
		return res.status(404).json({ success: false, message: 'Salary record not found for this employee' })
	}

	const target = monthlyRecord.items[itemIndex]
	target.status = status || 'Paid'
	if (typeof note === 'string') {
		target.note = note
	}

	monthlyRecord.markModified('items')
	await monthlyRecord.save()

	res.json({
		success: true,
		data: {
			status: target.status,
			note: target.note || ''
		},
		message: 'Salary status updated successfully'
	})
})

export default { monthlySalaryReport, checkMonthlySalaryExists, calculateAndStoreMonthlySalary, recalculateSalaryForEmployee, markSalaryAsPaid }
