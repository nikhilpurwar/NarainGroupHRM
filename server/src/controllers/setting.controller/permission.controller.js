import Permission from '../../models/setting.model/permission.model.js'
import { refreshPermissionCache, getAllPermissions } from '../../utils/permissionCache.js'

export const listPermissions = async (req, res) => {
  try {
    // prefer returning cached permissions for speed
    let perms = getAllPermissions()
    if (!perms || perms.length === 0) {
      // cache cold? refresh and read from DB
      await refreshPermissionCache()
      perms = getAllPermissions()
    }
    res.json({ success: true, data: perms })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const upsertPermission = async (req, res) => {
  try {
    const { route, label, allowedRoles } = req.body
    if (!route) return res.status(400).json({ success: false, message: 'Route is required' })
    const existing = await Permission.findOne({ route })
    if (existing) {
      existing.label = label || existing.label
      existing.allowedRoles = Array.isArray(allowedRoles) ? allowedRoles : existing.allowedRoles
      await existing.save()
      // refresh cache after update
      try { await refreshPermissionCache() } catch (e) { console.error('Permission cache refresh failed', e) }
      return res.json({ success: true, data: existing })
    }

    const created = await Permission.create({ route, label, allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [] })
    // refresh cache after create
    try { await refreshPermissionCache() } catch (e) { console.error('Permission cache refresh failed', e) }
    res.status(201).json({ success: true, data: created })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getPermissionByRoute = async (req, res) => {
  try {
    const { route } = req.params
    const perm = await Permission.findOne({ route })
    if (!perm) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: perm })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
