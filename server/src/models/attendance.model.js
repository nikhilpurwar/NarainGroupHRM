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
  // Total overtime hours (sum of all buckets below)
  overtimeHours: { type: Number, default: 0 },
  // OT buckets derived from punch logs + shift config
  dayOtHours: { type: Number, default: 0 },        // OT during daytime on normal working days
  nightOtHours: { type: Number, default: 0 },      // OT during night window (20:00–06:00)
  sundayOtHours: { type: Number, default: 0 },     // OT on weekends (Sun/Sat)
  festivalOtHours: { type: Number, default: 0 },   // OT on holidays
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

// // Invalidate daily salary cache when attendance affecting a date changes
// import dailyCache from '../services/dailySalaryCache.service.js'

// AttendanceSchema.post('save', function (doc) {
//   try { dailyCache.invalidateByDate(doc.date).catch(() => {}) } catch (e) {}
// })

// AttendanceSchema.post('remove', function (doc) {
//   try { dailyCache.invalidateByDate(doc.date).catch(() => {}) } catch (e) {}
// })

// // For findOneAndUpdate / findOneAndDelete operations
// AttendanceSchema.post('findOneAndUpdate', function (doc) {
//   if (doc && doc.date) dailyCache.invalidateByDate(doc.date).catch(() => {})
// })
// AttendanceSchema.post('findOneAndDelete', function (doc) {
//   if (doc && doc.date) dailyCache.invalidateByDate(doc.date).catch(() => {})
// })

const Attendance = mongoose.model('Attendance', AttendanceSchema)
export default Attendance
