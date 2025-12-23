import mongoose from 'mongoose'

const HeadDeptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // optional short code (unique when present). Make it sparse so multiple documents
  // without a code (null/undefined) won't violate uniqueness.
  code: { type: String, unique: true, sparse: true },
  key: { type: String },
  // code: { type: String, unique: true, sparse: true },
  description: { type: String },
  hod: { type: String },
  reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'HeadDepartment' },
  hierarchy: { type: Number, default: 0 } // 0: Owner, 1: Plant Head, 2: Manager, etc.
}, { timestamps: true })

const SubDeptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // optional short code (unique when present)
  code: { type: String, unique: true, sparse: true },
  // code: { type: String, unique: true, sparse: true },
  headDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'HeadDepartment', required: true },
  description: { type: String },
  hod: { type: String },
  reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'HeadDepartment' },
  hierarchy: { type: Number, default: 1 }
}, { timestamps: true })

// const GroupSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   code: { type: String, unique: true, sparse: true },
//   description: { type: String },
//   // optional link to HeadDepartment for UI-driven sectioning
//   headDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'HeadDepartment' },
//   // legacy `section` kept for compatibility; not required
//   section: { type: String, enum: ['PLANT', 'OFFICE', 'FINISH'] },
//   reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
//   hierarchy: { type: Number, default: 0 }
// }, { timestamps: true })

const DesignationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  // code: { type: String, unique: true, sparse: true },
  subDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'SubDepartment', required: true },
  reportsToDesignation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  shiftHours: { type: Number, default: 8 },
  description: { type: String }
}, { timestamps: true })

const HeadDepartment = mongoose.model('HeadDepartment', HeadDeptSchema)
const SubDepartment = mongoose.model('SubDepartment', SubDeptSchema)
// const Group = mongoose.model('Group', GroupSchema)
const Designation = mongoose.model('Designation', DesignationSchema)

// Ensure indexes: create sparse unique index for code to avoid duplicate-null key errors
HeadDeptSchema.index({ code: 1 }, { unique: true, sparse: true })
SubDeptSchema.index({ code: 1 }, { unique: true, sparse: true })

export { HeadDepartment, SubDepartment, Designation }
