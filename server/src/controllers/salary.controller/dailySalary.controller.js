import { asyncHandler } from '../../middleware/async.middleware.js'
import salaryService from '../../services/salary.service.js'

export const dailySalaryReport = asyncHandler(async (req, res) => {
	const { fromDate, toDate, employeeId, page, pageSize } = req.query
	if (!fromDate || !toDate) {
		return res.status(400).json({ success: false, message: 'fromDate and toDate are required' })
	}
	const report = await salaryService.computeSalaryReport({ fromDate, toDate, employeeId, page: Number(page) || 1, pageSize: Number(pageSize) || 15 })
	res.json({ success: true, data: report, message: 'Daily salary report' })
})

export default { dailySalaryReport }
