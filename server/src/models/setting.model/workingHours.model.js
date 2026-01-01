import mongoose from 'mongoose'

const BreakSchema = new mongoose.Schema({
  // Align with client AddEditTimings payload
  shiftName: { type: String },
  shiftHour: { type: Number },
  shiftStart: { type: String },
  shiftEnd: { type: String },
  breakInTime: { type: String },
  breakOutTime: { type: String },
  // nightIn: { type: String },
  // nightOut: { type: String },
  status: { type: Number, default: 1 }
}, { timestamps: true })

const BreakTime = mongoose.model('BreakTime', BreakSchema)
export default BreakTime
