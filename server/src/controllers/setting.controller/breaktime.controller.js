import BreakTime from '../../models/setting.model/breaktime.model.js'

export const createBreak = async (req, res) => {
  try {
    const b = await BreakTime.create(req.body)
    res.status(201).json({ success: true, data: b })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const listBreaks = async (req, res) => {
  try {
    const list = await BreakTime.find().sort({ createdAt: -1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateBreak = async (req, res) => {
  try {
    const b = await BreakTime.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!b) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: b })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteBreak = async (req, res) => {
  try {
    const b = await BreakTime.findByIdAndDelete(req.params.id)
    if (!b) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
