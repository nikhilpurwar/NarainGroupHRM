import User from '../models/setting.model/user.model.js'
import Employee from '../models/employee.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const loginAttempts = new Map()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

const checkRateLimit = (identifier) => {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier)
  
  if (attempts) {
    if (now - attempts.firstAttempt < LOCKOUT_TIME && attempts.count >= MAX_ATTEMPTS) {
      const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempts.firstAttempt)) / 60000)
      return { blocked: true, remainingTime }
    }
    if (now - attempts.firstAttempt >= LOCKOUT_TIME) {
      loginAttempts.delete(identifier)
    }
  }
  return { blocked: false }
}

const recordFailedAttempt = (identifier) => {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier)
  
  if (!attempts || now - attempts.firstAttempt >= LOCKOUT_TIME) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now })
  } else {
    attempts.count++
  }
}

const clearAttempts = (identifier) => {
  loginAttempts.delete(identifier)
}

export const login = async (req, res) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Server configuration error' })
    }
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const identifier = email.toLowerCase().trim()
    const rateLimit = checkRateLimit(identifier)
    
    if (rateLimit.blocked) {
      return res.status(429).json({ 
        success: false, 
        message: `Too many failed attempts. Try again in ${rateLimit.remainingTime} minutes` 
      })
    }

    let user = await User.findOne({ email: identifier })

    if (!user) {
      const emp = await Employee.findOne({
        $or: [{ empId: identifier }, { email: identifier }]
      })

      if (emp) {
        user = await User.findOne({ 
          email: { $in: [emp.empId, emp.email].filter(Boolean).map(e => e.toLowerCase().trim()) } 
        })
      }
    }

    if (!user) {
      recordFailedAttempt(identifier)
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    
    if (!user.isActive) {
      const admin = await User.findOne({ role: 'admin', isActive: true })
      const adminName = admin ? admin.name : 'Administrator'
      return res.status(403).json({ 
        success: false, 
        message: `Account is inactive. Contact admin (${adminName})`,
        forceLogout: true
      })
    }
    
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      recordFailedAttempt(identifier)
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    if (user.role && user.role.toString().toLowerCase() !== 'admin') {
      const emp = await Employee.findOne({ 
        $or: [{ empId: user.email }, { email: user.email }] 
      }).lean()
      if (emp && emp.status && emp.status.toString().toLowerCase() !== 'active') {
        return res.status(403).json({ success: false, message: 'Employee account is inactive' })
      }
    }

    clearAttempts(identifier)
    
    user.lastLogin = new Date()
    await user.save()
    
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    )
    res.json({ 
      success: true, 
      data: { 
        user: { 
          _id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          employee: user.employee 
        }, 
        token 
      } 
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' })
    }

    const hash = await bcrypt.hash(password, 12)
    const u = await User.create({ 
      name: name.trim(), 
      email: normalizedEmail, 
      password: hash, 
      role: role || 'account' 
    })
    res.status(201).json({ 
      success: true, 
      data: { _id: u._id, name: u.name, email: u.email, role: u.role } 
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export const changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      })
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError })
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be different from old password' 
      })
    }

    const identifier = email.toLowerCase().trim()
    let user = await User.findOne({ email: identifier })

    if (!user) {
      const emp = await Employee.findOne({
        $or: [{ empId: identifier }, { email: identifier }]
      })

      if (emp) {
        user = await User.findOne({ 
          email: { $in: [emp.empId, emp.email].filter(Boolean).map(e => e.toLowerCase().trim()) } 
        })
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(oldPassword, user.password)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    user.password = hash
    user.passwordChangedAt = new Date()
    await user.save()

    res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
