import { HeadDepartment, SubDepartment, Group } from '../models/setting.model/department.model.js'

export const listHeadDepartments = async (req, res) => {
  try {
    const list = await HeadDepartment.find().sort({ name: 1 })
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
    const d = await HeadDepartment.findByIdAndUpdate(req.params.id, payload, { new: true })
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
    const list = await SubDepartment.find().populate('headDepartment').sort({ name: 1 })
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
    const s = await SubDepartment.findByIdAndUpdate(req.params.id, payload, { new: true }).populate('headDepartment')
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
    const list = await Group.find().sort({ name: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createGroup = async (req, res) => {
  try {
    const g = await Group.create(req.body)
    res.status(201).json({ success: true, data: g })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
