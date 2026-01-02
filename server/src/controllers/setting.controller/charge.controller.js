import Charge from '../../models/setting.model/charge.model.js'
import salaryRecalcService from '../../services/salaryRecalculation.service.js'

export const createCharge = async (req, res) => {
  try {
    const c = await Charge.create(req.body)

    // Recalculate salary for current and previous month so deductions apply immediately
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
      console.error('Salary recalculation failed after createCharge:', err)
    )

    res.status(201).json({ success: true, data: c })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const listCharges = async (req, res) => {
  try {
    const list = await Charge.find().sort({ createdAt: -1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getCharge = async (req, res) => {
  try {
    const c = await Charge.findById(req.params.id)
    if (!c) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: c })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateCharge = async (req, res) => {
  try {
    const c = await Charge.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!c) return res.status(404).json({ success: false, message: 'Not found' })

    // Recalculate salary for current and previous month so updated deductions reflect in salary
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
      console.error('Salary recalculation failed after updateCharge:', err)
    )

    res.json({ success: true, data: c })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const deleteCharge = async (req, res) => {
  try {
    const c = await Charge.findByIdAndDelete(req.params.id)
    if (!c) return res.status(404).json({ success: false, message: 'Not found' })

    // Recalculate salary when a charge is removed
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
      console.error('Salary recalculation failed after deleteCharge:', err)
    )

    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
