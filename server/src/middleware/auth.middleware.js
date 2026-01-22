import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' })
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

export const checkUserActive = async (req, res, next) => {
  try {
    const User = (await import('../models/setting.model/user.model.js')).default
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your credentials terminated. Please contact admin',
        forceLogout: true
      })
    }
    if (!user.isActive) {
      const admin = await User.findOne({ role: 'admin', isActive: true })
      const adminName = admin ? admin.name : 'Administrator'
      return res.status(403).json({ 
        success: false, 
        message: `Your credentials temporarily terminated. Please contact admin (${adminName})`,
        forceLogout: true
      })
    }
    next()
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const authorize = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' })
  if (typeof roles === 'string') roles = [roles]
  if (roles.length === 0) return next()
  // Normalize roles and compare case-insensitively
  const normalizedReq = roles.map(r => (r || '').toString().toLowerCase())
  const userRole = (req.user.role || '').toString().toLowerCase()
  if (!normalizedReq.includes(userRole)) return res.status(403).json({ success: false, message: 'Forbidden' })
  next()
}
