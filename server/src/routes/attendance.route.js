import express from 'express'
import { attendanceReport, scanAttendance } from '../controllers/attendance.controller.js'

const router = express.Router()

router.get('/', attendanceReport)

// today's attendance (attendance day computed using 8:00 AM boundary)
router.get('/today', (req, res) => {
	// delegate to controller
	return import('../controllers/attendance.controller.js').then(m => m.todaysAttendance(req, res)).catch(err => res.status(500).json({ success: false, message: err.message }))
})

// backward-compatible path used by frontend: /api/attendance/today
router.get('/attendance/today', (req, res) => {
    return import('../controllers/attendance.controller.js').then(m => m.todaysAttendance(req, res)).catch(err => res.status(500).json({ success: false, message: err.message }))
})

// Barcode attendance endpoint - supports both GET and POST
router.get('/store-emp-attend', scanAttendance)
router.post('/store-emp-attend', scanAttendance)

export default router
