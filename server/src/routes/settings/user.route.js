import express from 'express'
import { listUsers, createUser, getUser, updateUser, deleteUser, toggleUserStatus } from '../../controllers/setting.controller/user.controller.js'
import { authenticate, authorize, checkUserActive } from '../../middleware/auth.middleware.js'
import { checkPermission } from '../../middleware/permission.middleware.js'

const router = express.Router()

router.post('/', authenticate, checkUserActive, authorize('admin'), checkPermission, createUser)
router.get('/', authenticate, checkUserActive, authorize('admin'), checkPermission, listUsers)
router.get('/:id', authenticate, checkUserActive, authorize('admin'), checkPermission, getUser)
router.put('/:id', authenticate, checkUserActive, authorize('admin'), checkPermission, updateUser)
router.patch('/:id/toggle', authenticate, checkUserActive, authorize('admin'), checkPermission, toggleUserStatus)
router.delete('/:id', authenticate, checkUserActive, authorize('admin'), checkPermission, deleteUser)

export default router
