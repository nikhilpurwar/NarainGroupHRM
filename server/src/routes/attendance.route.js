import express from 'express'
import { attendanceReport, scanAttendance } from '../controllers/attendance.controller.js'

const router = express.Router()

router.get('/', attendanceReport)

// Barcode attendance endpoint - supports both GET and POST
router.get('/store-emp-attend', scanAttendance)
router.post('/store-emp-attend', scanAttendance)

export default router
