import { HeadDepartment, SubDepartment, Group, Designation } from '../models/department.model.js'

export const listHeadDepartments = async (req, res) => {
  try {
    const list = await HeadDepartment.find().populate('reportsTo').sort({ hierarchy: 1, name: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createHeadDepartment = async (req, res) => {
  try {
    const d = await HeadDepartment.create(req.body)
    res.status(201).json({ success: true, data: d })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateHeadDepartment = async (req, res) => {
  try {
    const payload = { ...req.body }
    const d = await HeadDepartment.findByIdAndUpdate(req.params.id, payload, { new: true }).populate('reportsTo')
    if (!d) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: d })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteHeadDepartment = async (req, res) => {
  try {
    const d = await HeadDepartment.findByIdAndDelete(req.params.id)
    if (!d) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const listSubDepartments = async (req, res) => {
  try {
    const list = await SubDepartment.find()
      .populate('headDepartment')
      .populate('reportsTo')
      .sort({ name: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createSubDepartment = async (req, res) => {
  try {
    const s = await SubDepartment.create(req.body)
    res.status(201).json({ success: true, data: s })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateSubDepartment = async (req, res) => {
  try {
    const payload = { ...req.body }
    const s = await SubDepartment.findByIdAndUpdate(req.params.id, payload, { new: true })
      .populate('headDepartment')
      .populate('reportsTo')
    if (!s) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: s })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteSubDepartment = async (req, res) => {
  try {
    const s = await SubDepartment.findByIdAndDelete(req.params.id)
    if (!s) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const listGroups = async (req, res) => {
  try {
    const list = await Group.find()
      .populate('reportsTo')
      .populate('headDepartment')
      .sort({ hierarchy: 1, name: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    console.error('listGroups error:', err && err.stack ? err.stack : err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createGroup = async (req, res) => {
  try {
    const payload = { ...req.body }
    Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k] })
    const g = await Group.create(payload)
    res.status(201).json({ success: true, data: g })
  } catch (err) {
    console.error('createGroup error:', err && err.stack ? err.stack : err)
    // Duplicate key (unique index) -> send 400 with useful message
    if (err && err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0]
      return res.status(400).json({ success: false, message: `${field || 'field'} already exists`, details: err.keyValue })
    }
    // Mongoose validation error
    if (err && err.name === 'ValidationError') {
      const details = Object.values(err.errors || {}).map(e => e.message)
      return res.status(400).json({ success: false, message: 'Validation failed', details })
    }
    res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}

export const updateGroup = async (req, res) => {
  try {
    const payload = { ...req.body }
    const g = await Group.findByIdAndUpdate(req.params.id, payload, { new: true })
      .populate('reportsTo')
    if (!g) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: g })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteGroup = async (req, res) => {
  try {
    const g = await Group.findByIdAndDelete(req.params.id)
    if (!g) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const listDesignations = async (req, res) => {
  try {
    const list = await Designation.find()
      .populate('group')
      .populate('reportsToDesignation')
      .sort({ 'group._id': 1, name: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createDesignation = async (req, res) => {
  try {
    const d = await Designation.create(req.body)
    res.status(201).json({ success: true, data: d })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateDesignation = async (req, res) => {
  try {
    const payload = { ...req.body }
    const d = await Designation.findByIdAndUpdate(req.params.id, payload, { new: true })
      .populate('group')
      .populate('reportsToDesignation')
    if (!d) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: d })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteDesignation = async (req, res) => {
  try {
    const d = await Designation.findByIdAndDelete(req.params.id)
    if (!d) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
