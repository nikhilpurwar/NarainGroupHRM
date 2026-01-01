import mongoose from 'mongoose'

const MonthlySummarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  year: { type: Number, required: true, index: true },
  month: { type: Number, required: true, index: true }, // 1-12
  totalPresent: { type: Number, default: 0 },
  totalAbsent: { type: Number, default: 0 },
  totalHalfday: { type: Number, default: 0 },
  totalLeave: { type: Number, default: 0 },
  totalWorkingDays: { type: Number, default: 0 },
  totalHoursWorked: { type: Number, default: 0 },
  totalOvertimeHours: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true })

// Compound index for fast lookups
MonthlySummarySchema.index({ employee: 1, year: 1, month: 1 }, { unique: true })

// Static helper: get or create summary
MonthlySummarySchema.statics.getOrCreate = async function (employeeId, year, month) {
  let summary = await this.findOne({ employee: employeeId, year, month })
  if (!summary) {
    summary = await this.create({ employee: employeeId, year, month })
  }
  return summary
}

const MonthlySummary = mongoose.model('MonthlySummary', MonthlySummarySchema)
export default MonthlySummary
