import express from 'express'
import { createBreak, listBreaks, updateBreak, deleteBreak } from '../controllers/breaktime.controller.js'
import { authenticate, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', authenticate, authorize('admin'), createBreak)
router.get('/', listBreaks)
router.put('/:id', authenticate, authorize('admin'), updateBreak)
router.delete('/:id', authenticate, authorize('admin'), deleteBreak)

export default router
