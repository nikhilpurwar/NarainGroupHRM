import Permission from '../models/setting.model/permission.model.js'

// In-memory cache mapping route -> { route, label, allowedRoles }
let cache = new Map()

export const refreshPermissionCache = async () => {
  const rows = await Permission.find().lean()
  cache.clear()
  rows.forEach(r => {
    if (r && r.route) cache.set(r.route.replace(/\/+$/g, ''), { route: r.route, label: r.label, allowedRoles: r.allowedRoles })
  })
  return cache
}

export const findPermissionByCandidates = (candidates = []) => {
  for (const c of candidates) {
    const key = (c || '').replace(/\/+$/g, '')
    if (cache.has(key)) return cache.get(key)
  }
  return null
}

export const getAllPermissions = () => Array.from(cache.values())

export default {
  refreshPermissionCache,
  findPermissionByCandidates,
  getAllPermissions
}
