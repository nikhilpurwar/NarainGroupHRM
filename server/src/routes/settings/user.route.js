import express from 'express'
import { listUsers, createUser, getUser, updateUser, deleteUser } from '../../controllers/setting.controller/user.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'
import { checkPermission } from '../../middleware/permission.middleware.js'

const router = express.Router()

router.post('/', authenticate, authorize('Admin'), checkPermission, createUser)
router.get('/', authenticate, authorize('Admin'), checkPermission, listUsers)
router.get('/:id', authenticate, authorize('Admin'), checkPermission, getUser)
router.put('/:id', authenticate, authorize('Admin'), checkPermission, updateUser)
router.delete('/:id', authenticate, authorize('Admin'), checkPermission, deleteUser)

export default router
