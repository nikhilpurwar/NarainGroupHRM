import express from 'express'
import { listUsers, createUser, getUser, updateUser, deleteUser } from '../../controllers/setting.controller/user.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', authenticate, authorize('admin'), createUser)
router.get('/', authenticate, authorize('admin'), listUsers)
router.get('/:id', authenticate, authorize('admin'), getUser)
router.put('/:id', authenticate, authorize('admin'), updateUser)
router.delete('/:id', authenticate, authorize('admin'), deleteUser)

export default router
