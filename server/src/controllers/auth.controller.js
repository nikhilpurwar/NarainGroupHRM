import User from '../models/user.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey'

export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' })
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
