import express from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth.middleware.js'
import { checkPermission } from '../middleware/permission.middleware.js'
import {
  listAdvances,
  getAdvance,
  createAdvance,
  updateAdvance,
  deleteAdvance,
  toggleAdvanceStatus
} from '../controllers/advance.controller.js'

const router = express.Router()

// multer temp storage in system temp; controller will move file into uploads
const upload = multer({ dest: 'tmp/uploads' })

router.get('/', authenticate, checkPermission, listAdvances)
router.get('/:id', authenticate, getAdvance)
router.post('/', authenticate, upload.single('attachment'), createAdvance)
router.put('/:id', authenticate, upload.single('attachment'), updateAdvance)
router.delete('/:id', authenticate, checkPermission, deleteAdvance)
router.patch('/:id/status', authenticate, checkPermission, toggleAdvanceStatus)

export default router
