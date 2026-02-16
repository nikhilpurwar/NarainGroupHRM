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
}, { timestamps: true });

/**
 * Auto-calculate balance before save
 * Use synchronous middleware (no `next`) to avoid signature mismatches
 */
AdvanceSchema.pre('save', function () {
  if (this.amount !== undefined && this.deduction !== undefined) {
    this.balance = this.amount - this.deduction
  }
})


/**
 * Auto-calculate balance before findOneAndUpdate
 * Handles both direct update and {$set: {...}} shapes.
 */
AdvanceSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() || {}
  // support updates that use $set
  const updateTarget = update.$set ? update.$set : update
  if (updateTarget.amount !== undefined && updateTarget.deduction !== undefined) {
    updateTarget.balance = updateTarget.amount - updateTarget.deduction
    if (update.$set) update.$set = updateTarget
    else {
      // assign back to update object
      Object.assign(update, updateTarget)
    }
    this.setUpdate(update)
  }
})


const Advance = mongoose.model('Advance', AdvanceSchema)
// import dailyCache from '../services/dailySalaryCache.service.js'

// AdvanceSchema.post('save', function (doc) {
//   if (doc && doc.date) dailyCache.invalidateByDate(doc.date).catch(() => {})
// })
// AdvanceSchema.post('findOneAndUpdate', function (doc) {
//   if (doc && doc.date) dailyCache.invalidateByDate(doc.date).catch(() => {})
// })
// AdvanceSchema.post('findOneAndDelete', function (doc) {
//   if (doc && doc.date) dailyCache.invalidateByDate(doc.date).catch(() => {})
// })

export default Advance
