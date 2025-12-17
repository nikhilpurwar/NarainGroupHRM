import mongoose from 'mongoose'

const BreakSchema = new mongoose.Schema({
  // Align with client AddEditTimings payload
  timestart: { type: String },
  endtime: { type: String },
  inTime: { type: String },
  outTime: { type: String },
  nightIn: { type: String },
  nightOut: { type: String },
  status: { type: Number, default: 1 }
}, { timestamps: true })

const BreakTime = mongoose.model('BreakTime', BreakSchema)
export default BreakTime
