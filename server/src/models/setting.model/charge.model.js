import mongoose from 'mongoose'

const ChargeSchema = new mongoose.Schema({
  deduction: { type: String, required: true },
  value_type: { type: String, enum: ['INR', 'Percentage'], default: 'INR' },
  value: { type: Number, required: true },
  status: { type: Number, default: 1 }
}, { timestamps: true })

const Charge = mongoose.model('Charge', ChargeSchema)
// import dailyCache from '../../services/dailySalaryCache.service.js'

// // When charge definitions change, they can affect deductions for all days.
// // We clear the entire daily cache to avoid stale deduction calculations.
// ChargeSchema.post('save', function () {
//   try { dailyCache.invalidateAll().catch(() => {}) } catch (e) {}
// })
// ChargeSchema.post('findOneAndUpdate', function () {
//   try { dailyCache.invalidateAll().catch(() => {}) } catch (e) {}
// })
// ChargeSchema.post('findOneAndDelete', function () {
//   try { dailyCache.invalidateAll().catch(() => {}) } catch (e) {}
// })

export default Charge
