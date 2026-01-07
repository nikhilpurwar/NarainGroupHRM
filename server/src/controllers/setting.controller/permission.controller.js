import Permission from '../../models/setting.model/permission.model.js'

export const listPermissions = async (req, res) => {
  try {
    const perms = await Permission.find().sort({ route: 1 })
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
      return res.json({ success: true, data: existing })
    }

    const created = await Permission.create({ route, label, allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [] })
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
