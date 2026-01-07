import express from 'express'
import { listPermissions, upsertPermission, getPermissionByRoute } from '../../controllers/setting.controller/permission.controller.js'

const router = express.Router()

router.get('/', listPermissions)
router.post('/', upsertPermission)
router.get('/:route', getPermissionByRoute)

export default router
