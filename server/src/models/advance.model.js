import mongoose from 'mongoose'

const AdvanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  start_from: { type: Date },
  type: { type: String, enum: ['loan', 'advance'], required: true },
  amount: { type: Number, required: true },
  instalment: { type: Number },
  deduction: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  totalInstalment: { type: Number },
  reason: { type: String },
  attachment: { type: String }, // stored filename/path
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true })

const Advance = mongoose.model('Advance', AdvanceSchema)
export default Advance
