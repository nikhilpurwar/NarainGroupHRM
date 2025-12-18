import User from '../../models/user.model.js'
import bcrypt from 'bcrypt'

const normalizeRole = (r) => {
  if (!r) return 'accounts'
  const role = String(r).toLowerCase()
  if (role.startsWith('admin')) return 'admin'
  if (role.startsWith('gate')) return 'gate'
  return 'accounts'
}

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json({ success: true, data: users })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' })
    const hash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('password', 10)
    const r = normalizeRole(role)
    const u = await User.create({ name, email, password: hash, role: r })
    res.status(201).json({ success: true, data: { _id: u._id, name: u.name, email: u.email, role: u.role } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getUser = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('-password')
    if (!u) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: u })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateUser = async (req, res) => {
  try {
    const payload = { ...req.body }
    if (payload.role) payload.role = normalizeRole(payload.role)
    if (payload.password) payload.password = await bcrypt.hash(payload.password, 10)
    const u = await User.findByIdAndUpdate(req.params.id, payload, { new: true }).select('-password')
    if (!u) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: u })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const u = await User.findByIdAndDelete(req.params.id)
    if (!u) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
