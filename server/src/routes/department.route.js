import express from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/permission.middleware.js'
import {
  listHeadDepartments,
  createHeadDepartment,
  updateHeadDepartment,
  deleteHeadDepartment,
  listSubDepartments,
  createSubDepartment,
  updateSubDepartment,
  deleteSubDepartment,
  // listGroups,
  // createGroup,
  // updateGroup,
  // deleteGroup,
  listDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from '../controllers/department.controller.js'

const router = express.Router()

router.get('/head-departments', authenticate, checkPermission, listHeadDepartments)
router.post('/head-departments', authenticate, checkPermission, createHeadDepartment)
router.put('/head-departments/:id', authenticate, checkPermission, updateHeadDepartment)
router.delete('/head-departments/:id', authenticate, checkPermission, deleteHeadDepartment)

router.get('/sub-departments', authenticate, checkPermission, listSubDepartments)
router.post('/sub-departments', authenticate, checkPermission, createSubDepartment)
router.put('/sub-departments/:id', authenticate, checkPermission, updateSubDepartment)
router.delete('/sub-departments/:id', authenticate, checkPermission, deleteSubDepartment)

// router.get('/groups', listGroups)
// router.post('/groups', authenticate, checkPermission, createGroup)
// router.put('/groups/:id', authenticate, checkPermission, updateGroup)
// router.delete('/groups/:id', authenticate, checkPermission, deleteGroup)

router.get('/designations', authenticate, checkPermission, listDesignations)
router.post('/designations', authenticate, checkPermission, createDesignation)
router.put('/designations/:id', authenticate, checkPermission, updateDesignation)
router.delete('/designations/:id', authenticate, checkPermission, deleteDesignation)

export default router