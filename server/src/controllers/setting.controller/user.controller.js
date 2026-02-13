import User from '../../models/setting.model/user.model.js'
import Employee from '../../models/employee.model.js'
import bcrypt from 'bcrypt'

const normalizeRole = (r) => {
  if (!r) return 'account'
  const role = String(r).toLowerCase()
  if (role.startsWith('admin')) return 'admin'
  if (role.startsWith('gate')) return 'gate'
  return 'account'
}

export const listUsers = async (req, res) => {
  try {
    const users = await User.find().populate('employee', 'name empId email avatar').select('-password').sort({ createdAt: -1 }).lean()
    res.json({ success: true, data: users })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, employeeId } = req.body
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' })
    
    let employee = null
    if (employeeId) {
      employee = await Employee.findById(employeeId)
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' })
    } else if (email) {
      employee = await Employee.findOne({ $or: [{ empId: email }, { email }] })
    }
    
    const hash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('password', 10)
    const r = normalizeRole(role)
    const u = await User.create({ 
      name, 
      email, 
      password: hash, 
      role: r,
      employee: employee?._id 
    })
    res.status(201).json({ success: true, data: { _id: u._id, name: u.name, email: u.email, role: u.role, employee: u.employee } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getUser = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).populate('employee', 'name empId email avatar').select('-password').lean()
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
    if (payload.employeeId) {
      const employee = await Employee.findById(payload.employeeId)
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' })
      payload.employee = payload.employeeId
      delete payload.employeeId
    }
    const u = await User.findByIdAndUpdate(req.params.id, payload, { new: true }).populate('employee', 'name empId email avatar').select('-password')
    if (!u) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: u })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    
    user.isActive = !user.isActive
    await user.save()
    
    res.json({ success: true, data: user, message: `User ${user.isActive ? 'activated' : 'deactivated'}` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const u = await User.findByIdAndDelete(req.params.id)
    if (!u) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'User permanently deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
