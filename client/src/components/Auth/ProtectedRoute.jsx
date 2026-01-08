import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import usePermissions from '../../hooks/usePermissions'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

const AccessDenied = ({ userRole }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
    <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-3">Access Denied</h2>
      <p className="text-gray-600 mb-6">Your role <span className="font-semibold">{userRole}</span> does not have permission to access this page.</p>
      <button onClick={() => window.history.back()} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Go Back</button>
    </div>
  </div>
)

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const storedUser = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null')
    : null

  const userRole = storedUser?.role
  const location = useLocation()

  const { permissionsMap, status } = usePermissions()
  const loading = status === 'loading'

  if (!userRole) return <Navigate to="/login" replace />

  // Normalize role for case-insensitive comparisons
  const role = (userRole || '').toString().toLowerCase()

  // Admin bypass (case-insensitive)
  if (role === 'admin') return children

  // If explicit requiredRoles prop is provided, honor it
  if (requiredRoles.length > 0) {
    const normalizedReq = requiredRoles.map(r => r.toString().toLowerCase())
    if (normalizedReq.includes(role)) return children
    return <AccessDenied userRole={userRole} />
  }
  // While permissions are loading, allow immediate render to avoid blocking navigation.
  // Permission enforcement will occur once the map is available.
  if (loading) return children

  // Check permission for current pathname
  const path = location.pathname

  const findAllowedForPath = (pmap, pathname) => {
    if (!pmap) return null
    // exact match
    if (pmap[pathname]) return pmap[pathname]
    // try pattern match for routes with params like /profile/:id
    const keys = Object.keys(pmap)
    for (let k of keys) {
      try {
        if (k.includes('/:') || k.includes(':')) {
          const pattern = '^' + k.replace(/:[^/]+/g, '[^/]+') + '$'
          const re = new RegExp(pattern)
          if (re.test(pathname)) return pmap[k]
        } else {
          // allow permission defined as '/profile' to match '/profile/:id'
          const base = k.replace(/\/$/, '')
          const pattern = '^' + base + '(?:/[^/]+)?$'
          const re = new RegExp(pattern)
          if (re.test(pathname)) return pmap[k]
        }
      } catch (e) {
        // ignore invalid regex
      }
    }
    return null
  }

  const allowed = findAllowedForPath(permissionsMap, path)

  // If no permission entry, deny for non-admins (sidebar also hides these)
  if (!allowed) {
    // Allow profile routes to render and let server enforce owner-only access
    if (path.startsWith('/profile')) return children
    return <AccessDenied userRole={userRole} />
  }

  if (Array.isArray(allowed) && allowed.some(a => a.toString().toLowerCase() === role)) return children

  return <AccessDenied userRole={userRole} />
}

export default ProtectedRoute
