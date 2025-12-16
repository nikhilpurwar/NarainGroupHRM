import express from 'express'
import {
  listHeadDepartments,
  createHeadDepartment,
  updateHeadDepartment,
  deleteHeadDepartment,
  listSubDepartments,
  createSubDepartment,
  updateSubDepartment,
  deleteSubDepartment,
  listGroups,
  createGroup,
} from '../controllers/setting.controller.js'

const router = express.Router()
import { authenticate, authorize } from '../middleware/auth.middleware.js'

router.get('/head-departments', listHeadDepartments)
router.post('/head-departments', createHeadDepartment)
router.put('/head-departments/:id', authenticate, authorize('admin'), updateHeadDepartment)
router.delete('/head-departments/:id', authenticate, authorize('admin'), deleteHeadDepartment)

router.get('/sub-departments', listSubDepartments)
router.post('/sub-departments', authenticate, authorize('admin'), createSubDepartment)
router.put('/sub-departments/:id', authenticate, authorize('admin'), updateSubDepartment)
router.delete('/sub-departments/:id', authenticate, authorize('admin'), deleteSubDepartment)

router.get('/groups', listGroups)
router.post('/groups', authenticate, authorize('admin'), createGroup)

export default router
