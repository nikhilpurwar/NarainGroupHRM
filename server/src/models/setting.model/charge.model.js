import mongoose from 'mongoose'

const ChargeSchema = new mongoose.Schema({
  deduction: { type: String, required: true },
  value_type: { type: String, enum: ['INR', 'Percentage'], default: 'INR' },
  value: { type: Number, required: true },
  status: { type: Number, default: 1 }
}, { timestamps: true })

const Charge = mongoose.model('Charge', ChargeSchema)
export default Charge
