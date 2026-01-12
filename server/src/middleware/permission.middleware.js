import { findPermissionByCandidates } from '../utils/permissionCache.js'

export const checkPermission = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
    
    // normalize user role to lowercase for case-insensitive checks
    const userRole = (req.user.role || '').toString().toLowerCase()
    // Admin bypass: admin users can access everything
    if (userRole === 'admin') return next()
    const requestPath = req.path
    const base = req.baseUrl || ''
    const original = req.originalUrl || ''

    // build candidate route keys to match permission entries created for frontend routes
    const candidates = []
    // exact path within router
    if (requestPath) candidates.push(requestPath)
    // base + path (e.g., /api/employees/)
    if (base) candidates.push(base + requestPath)
    // originalUrl without query
    if (original) candidates.push(original.split('?')[0])
    // also try stripping common prefixes like /api or /settings to match frontend route names
    const strippedBase = (base || '').replace(/^\/api/, '').replace(/^\/settings/, '')
    if (strippedBase) candidates.push(strippedBase)

    // normalize candidates (remove trailing slashes)
    const normalized = Array.from(new Set(candidates.map(c => c.replace(/\/+$/g, '')))).filter(Boolean)

    // Try cache lookup first
    const perm = findPermissionByCandidates(normalized)

    // If no permission entry exists, allow access
    if (!perm) return next()

    // If allowedRoles is not provided, treat as unrestricted
    if (!perm.allowedRoles) return next()

    // If allowedRoles is an empty array, deny access to everyone
    if (Array.isArray(perm.allowedRoles) && perm.allowedRoles.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied. This route is not allowed for any role.' })
    }

    // Check if user's role is in allowed roles (case-insensitive)
    if (Array.isArray(perm.allowedRoles)) {
      const allowedLower = perm.allowedRoles.map(r => (r || '').toString().toLowerCase())
      if (allowedLower.includes(userRole)) return next()
    }
    // If request came from an allowed frontend page (referer), allow based on that page's permission
    try {
      const referer = req.get('Referer') || req.get('Origin')
      if (referer) {
        try {
          const refererUrl = new URL(referer)
          const refererPath = refererUrl.pathname.replace(/\/+$/g, '')
          if (refererPath) {
            const refCandidates = [refererPath]
            if (!refererPath.startsWith('/api')) refCandidates.push('/api' + refererPath)
            refCandidates.push(refererPath.replace(/^\/settings/, ''))
            const refNorm = Array.from(new Set(refCandidates.map(c => c.replace(/\/+$/g, '')))).filter(Boolean)
            const refPerm = findPermissionByCandidates(refNorm)
            if (refPerm && Array.isArray(refPerm.allowedRoles)) {
              const refAllowedLower = refPerm.allowedRoles.map(r => (r || '').toString().toLowerCase())
              if (refAllowedLower.includes(userRole)) return next()
            }
          }
        } catch (e) {
          // ignore malformed referer
        }
      }
    } catch (e) {
      // ignore referer-check errors
    }

    res.status(403).json({ success: false, message: `Access denied. Route requires one of: ${perm.allowedRoles.join(', ')}` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
