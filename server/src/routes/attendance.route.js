import express from 'express'
import { attendanceReport, todaysAttendance } from '../controllers/attendance.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/permission.middleware.js'

const router = express.Router()

router.get('/', authenticate, checkPermission, attendanceReport)

// today's attendance (attendance day computed using 07:00 AM boundary)
router.get('/today', authenticate, (req, res) => {
	return todaysAttendance(req, res)
})

// backward-compatible path used by frontend: /api/attendance/today
router.get('/attendance/today', authenticate, (req, res) => {
    return todaysAttendance(req, res)
})

// Barcode attendance endpoint - supports both GET and POST (auth optional for barcode readers)
// router.get('/store-emp-attend', scanAttendance)
// router.post('/store-emp-attend', scanAttendance)

export default router
