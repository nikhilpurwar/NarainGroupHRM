import jwt from 'jsonwebtoken'

export const authenticate = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'Server configuration error' })
  }
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }
  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', forceLogout: true })
    }
    return res.status(401).json({ success: false, message: 'Invalid token', forceLogout: true })
  }
}

export const checkUserActive = async (req, res, next) => {
  try {
    const User = (await import('../models/setting.model/user.model.js')).default
    const user = await User.findById(req.user.id)
    if (!user) {
      console.log('User not found in DB:', req.user.id)
      return res.status(403).json({ 
        success: false, 
        message: 'User account not found. Please login again',
        forceLogout: true
      })
    }
    if (!user.isActive) {
      const admin = await User.findOne({ role: 'admin', isActive: true })
      const adminName = admin ? admin.name : 'Developer'
      return res.status(403).json({ 
        success: false, 
        message: `Your credentials temporarily terminated. Please contact admin (${adminName})`,
        forceLogout: true
      })
    }
    next()
  } catch (err) {
    console.error('checkUserActive error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const authorize = (roles = []) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }
  if (typeof roles === 'string') roles = [roles]
  if (roles.length === 0) return next()
  const normalizedRoles = roles.map(r => (r || '').toString().toLowerCase().trim())
  const userRole = (req.user.role || '').toString().toLowerCase().trim()
  if (!normalizedRoles.includes(userRole)) {
    return res.status(403).json({ success: false, message: 'Access denied' })
  }
  next()
}
