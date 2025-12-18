import express from 'express'
import {
  createCharge,
  listCharges,
  getCharge,
  updateCharge,
  deleteCharge,
} from '../../controllers/setting.controller/charge.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', authenticate, authorize('admin'), createCharge)
router.get('/', listCharges)
router.get('/:id', getCharge)
router.put('/:id', authenticate, authorize('admin'), updateCharge)
router.delete('/:id', authenticate, authorize('admin'), deleteCharge)

export default router
