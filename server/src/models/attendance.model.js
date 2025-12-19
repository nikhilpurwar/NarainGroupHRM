import mongoose from 'mongoose'

const PunchLogSchema = new mongoose.Schema({
  punchType: { type: String, enum: ['IN', 'OUT'], required: true },
  punchTime: { type: Date, required: true },
}, { _id: false })

const AttendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  date: { type: Date, required: true, index: true },
  shift: { type: String, default: 'default', index: true },
  status: { type: String, enum: ['present', 'absent', 'halfday', 'leave'], default: 'present' },
  inTime: { type: String },
  outTime: { type: String },
  totalHours: { type: Number, default: 0 },
  regularHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  breakMinutes: { type: Number, default: 0 },
  isWeekend: { type: Boolean, default: false },
  isHoliday: { type: Boolean, default: false },
  punchLogs: [PunchLogSchema],
  note: { type: String }
}, { timestamps: true })

// Compound indexes for common queries and for scale
AttendanceSchema.index({ employee: 1, date: -1 })
AttendanceSchema.index({ employee: 1, date: 1 })
AttendanceSchema.index({ shift: 1 })

// Static helper: safe create to centralize creation behavior
AttendanceSchema.statics.safeCreate = async function (payload) {
  return this.create(payload)
}

const Attendance = mongoose.model('Attendance', AttendanceSchema)
export default Attendance
