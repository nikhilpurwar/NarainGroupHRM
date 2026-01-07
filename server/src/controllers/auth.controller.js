import User from '../models/setting.model/user.model.js'
import Employee from '../models/employee.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey'

export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    // "email" here is used as a generic identifier: can be empId or email

    // 1) Try direct user match (for existing users where email is stored as-is)
    let user = await User.findOne({ email })

    // 2) If not found, try resolving via Employee by empId or email, then map to User
    if (!user) {
      const emp = await Employee.findOne({
        $or: [{ empId: email }, { email }]
      })

      if (emp) {
        // User may have been created with either emp.empId or emp.email as its email field
        user = await User.findOne({ email: { $in: [emp.empId, emp.email].filter(Boolean) } })
      }
    }

    if (!user) return res.status(401).json({ success: false, message: 'Invalid Employee ID/Email' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid password' })
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ success: true, data: { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, token } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' })
    const hash = await bcrypt.hash(password, 10)
    const u = await User.create({ name, email, password: hash, role })
    res.status(201).json({ success: true, data: { _id: u._id, name: u.name, email: u.email, role: u.role } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email/Employee ID, old password and new password are required' })
    }

    // Resolve user same way as login: identifier can be empId or email
    let user = await User.findOne({ email })

    if (!user) {
      const emp = await Employee.findOne({
        $or: [{ empId: email }, { email }]
      })

      if (emp) {
        user = await User.findOne({ email: { $in: [emp.empId, emp.email].filter(Boolean) } })
      }
    }

    if (!user) return res.status(401).json({ success: false, message: 'Invalid Employee ID/Email' })

    const ok = await bcrypt.compare(oldPassword, user.password)
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid password' })

    const hash = await bcrypt.hash(newPassword, 10)
    user.password = hash
    await user.save()

    res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
