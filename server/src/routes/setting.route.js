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
  listDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from '../controllers/setting.controller.js'

const router = express.Router()
import { authenticate } from '../middleware/auth.middleware.js'

router.get('/head-departments', listHeadDepartments)
router.post('/head-departments', authenticate, createHeadDepartment)
router.put('/head-departments/:id', authenticate, updateHeadDepartment)
router.delete('/head-departments/:id', authenticate, deleteHeadDepartment)

router.get('/sub-departments', listSubDepartments)
router.post('/sub-departments', authenticate, createSubDepartment)
router.put('/sub-departments/:id', authenticate, updateSubDepartment)
router.delete('/sub-departments/:id', authenticate, deleteSubDepartment)

router.get('/groups', listGroups)
router.post('/groups', authenticate, createGroup)

router.get('/designations', listDesignations)
router.post('/designations', authenticate, createDesignation)
router.put('/designations/:id', authenticate, updateDesignation)
router.delete('/designations/:id', authenticate, deleteDesignation)

export default router
