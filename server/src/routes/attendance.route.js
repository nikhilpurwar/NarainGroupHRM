import express from 'express'
import { attendanceReport } from '../controllers/attendance.controller.js'

const router = express.Router()

router.get('/', attendanceReport)

export default router
