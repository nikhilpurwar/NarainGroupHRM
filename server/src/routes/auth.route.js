import express from 'express'
import { login, register, changePassword } from '../controllers/auth.controller.js'
import { authenticate, authorize, checkUserActive } from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/permission.middleware.js'

const router = express.Router()

router.post('/login', login)
router.post('/register', authenticate, checkUserActive, authorize('admin'), checkPermission, register)
router.post('/change-password', authenticate, checkUserActive, changePassword)

export default router
