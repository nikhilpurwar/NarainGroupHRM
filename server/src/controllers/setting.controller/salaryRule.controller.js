import { asyncHandler } from '../../middleware/async.middleware.js'
import SalaryRule from '../../models/setting.model/salaryRule.model.js'
import salaryRecalcService from '../../services/salaryRecalculation.service.js'

export const listSalaryRules = asyncHandler(async (req, res) => {
  const rules = await SalaryRule.find().populate('subDepartment', 'name').lean()
  res.json({ success: true, data: rules })
})

export const getSalaryRule = asyncHandler(async (req, res) => {
  const r = await SalaryRule.findById(req.params.id).populate('subDepartment', 'name').lean()
  if (!r) return res.status(404).json({ success: false, message: 'Not found' })
  res.json({ success: true, data: r })
})

export const createSalaryRule = asyncHandler(async (req, res) => {
  const payload = req.body
  // upsert by subDepartment to ensure one rule per sub-dept
  if (!payload.subDepartment) return res.status(400).json({ success: false, message: 'subDepartment is required' })
  let existing = await SalaryRule.findOne({ subDepartment: payload.subDepartment })
  if (existing) return res.status(409).json({ success: false, message: 'Rule for this subDepartment already exists' })
  const created = await SalaryRule.create(payload)

  // Salary rules affect how salaries are computed; refresh cached salaries
  salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
    console.error('Salary recalculation failed after createSalaryRule:', err)
  )

  res.json({ success: true, data: created })
})

export const updateSalaryRule = asyncHandler(async (req, res) => {
  const id = req.params.id
  const payload = req.body
  const updated = await SalaryRule.findByIdAndUpdate(id, payload, { new: true })
  if (!updated) return res.status(404).json({ success: false, message: 'Not found' })

  // Refresh salaries when rule parameters change
  salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
    console.error('Salary recalculation failed after updateSalaryRule:', err)
  )

  res.json({ success: true, data: updated })
})

export const deleteSalaryRule = asyncHandler(async (req, res) => {
  const id = req.params.id
  const removed = await SalaryRule.findByIdAndDelete(id)
  if (!removed) return res.status(404).json({ success: false, message: 'Not found' })

  // Removing a rule changes salary logic; recompute current/previous months
  salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
    console.error('Salary recalculation failed after deleteSalaryRule:', err)
  )

  res.json({ success: true, data: removed })
})

export default { listSalaryRules, getSalaryRule, createSalaryRule, updateSalaryRule, deleteSalaryRule }
