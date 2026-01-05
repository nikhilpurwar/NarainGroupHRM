import mongoose from 'mongoose'

const SalaryRuleSchema = new mongoose.Schema({
  subDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'SubDepartment', required: true, unique: true },
  name: { type: String },
  fixedSalary: { type: Boolean, default: false },
  allowFestivalOT: { type: Boolean, default: true },
  allowDailyOT: { type: Boolean, default: true },
  allowSundayOT: { type: Boolean, default: true },
  allowNightOT: { type: Boolean, default: true },
  absenceDeduction: { type: Boolean, default: true },
  gatePassDeduction: { type: Boolean, default: true },
  shiftHours: { type: Number, default: 8 },
  oneHolidayPerMonth: { type: Boolean, default: false },
  sundayAutopayRequiredLastWorkingDays: { type: Number, default: 4 },
  festivalAutopayRequiredPrevDays: { type: Number, default: 2 },
  // 5-day (Mon-Fri) or 6-day (Mon-Sat) working week
  workingDaysPerWeek: { type: Number, enum: [5, 6], default: 6 },
  // Additional free-form settings
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

const SalaryRule = mongoose.model('SalaryRule', SalaryRuleSchema)
export default SalaryRule
