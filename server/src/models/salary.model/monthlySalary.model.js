import mongoose from 'mongoose'

const MonthlySalarySchema = new mongoose.Schema({
  monthKey: { type: String, required: true, index: true, unique: true }, // e.g. '2025-12'
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  items: { type: Array, default: [] },
  summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  totalRecords: { type: Number, default: 0 }
}, { timestamps: true })

const MonthlySalary = mongoose.model('MonthlySalary', MonthlySalarySchema)
export default MonthlySalary
