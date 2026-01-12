import express from 'express'
import { getMonthlySummaries } from '../controllers/monthlySummary.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = express.Router()

// public read route (requires auth to see employee IDs)
router.get('/', authenticate, getMonthlySummaries)

export default router
