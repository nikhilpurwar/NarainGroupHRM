import Advance from '../models/advance.model.js'
import Employee from '../models/employee.model.js'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'advances')

const ensureUploadDir = () => {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  } catch (e) {}
}

export const listAdvances = async (req, res) => {
  try {
    const list = await Advance.find().populate('employee').sort({ createdAt: -1 })
    res.json({ success: true, data: list })
  } catch (err) {
    console.error('listAdvances error', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getAdvance = async (req, res) => {
  try {
    const adv = await Advance.findById(req.params.id).populate('employee')
    if (!adv) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: adv })
  } catch (err) {
    console.error('getAdvance error', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export const createAdvance = async (req, res) => {
  try {
    // handle attachment if present (multer will set req.file)
    const body = { ...req.body }
    if (req.file) {
      ensureUploadDir()
      // file already saved by multer in temp location; move to upload dir if necessary
      const filename = req.file.filename || req.file.originalname
      const dest = path.join(UPLOAD_DIR, filename)
      // req.file.path is where multer stored
      try { fs.renameSync(req.file.path, dest) } catch (e) { /* ignore */ }
      body.attachment = path.relative(process.cwd(), dest)
    }

    // ensure employee exists
    const emp = await Employee.findById(body.employee)
    if (!emp) return res.status(400).json({ success: false, message: 'Employee not found' })

    // parse numeric fields
    if (body.amount) body.amount = Number(body.amount)
    if (body.instalment) body.instalment = Number(body.instalment)
    if (body.deduction) body.deduction = Number(body.deduction)
    if (body.balance) body.balance = Number(body.amount-body.deduction)
    if (body.totalInstalment) body.totalInstalment = Number(body.totalInstalment)
    if (body.date) body.date = new Date(body.date)
    if (body.start_from) body.start_from = new Date(body.start_from)

    const adv = await Advance.create(body)
    res.status(201).json({ success: true, data: adv })
  } catch (err) {
    console.error('createAdvance error', err)
    if (err && err.name === 'ValidationError') {
      const details = Object.values(err.errors || {}).map(e => e.message)
      return res.status(400).json({ success: false, message: 'Validation failed', details })
    }
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateAdvance = async (req, res) => {
  try {
    const body = { ...req.body }
    if (req.file) {
      ensureUploadDir()
      const filename = req.file.filename || req.file.originalname
      const dest = path.join(UPLOAD_DIR, filename)
      try { fs.renameSync(req.file.path, dest) } catch (e) {}
      body.attachment = path.relative(process.cwd(), dest)
    }

    if (body.amount) body.amount = Number(body.amount)
    if (body.instalment) body.instalment = Number(body.instalment)
    if (body.deduction) body.deduction = Number(body.deduction)
    if (body.balance) body.balance = Number(body.balance)
    if (body.totalInstalment) body.totalInstalment = Number(body.totalInstalment)
    if (body.date) body.date = new Date(body.date)
    if (body.start_from) body.start_from = new Date(body.start_from)

    const adv = await Advance.findByIdAndUpdate(req.params.id, body, { new: true })
    if (!adv) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: adv })
  } catch (err) {
    console.error('updateAdvance error', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteAdvance = async (req, res) => {
  try {
    const adv = await Advance.findByIdAndDelete(req.params.id)
    if (!adv) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    console.error('deleteAdvance error', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export const toggleAdvanceStatus = async (req, res) => {
  try {
    const adv = await Advance.findById(req.params.id)
    if (!adv) return res.status(404).json({ success: false, message: 'Not found' })
    adv.status = adv.status === 'active' ? 'inactive' : 'active'
    await adv.save()
    res.json({ success: true, data: adv })
  } catch (err) {
    console.error('toggleAdvanceStatus error', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export default {
  listAdvances,
  getAdvance,
  createAdvance,
  updateAdvance,
  deleteAdvance,
  toggleAdvanceStatus
}
