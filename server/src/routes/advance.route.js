import express from 'express'
import multer from 'multer'
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

router.get('/', listAdvances)
router.get('/:id', getAdvance)
router.post('/', upload.single('attachment'), createAdvance)
router.put('/:id', upload.single('attachment'), updateAdvance)
router.delete('/:id', deleteAdvance)
router.patch('/:id/status', toggleAdvanceStatus)

export default router
