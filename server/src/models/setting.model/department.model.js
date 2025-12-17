import mongoose from 'mongoose'

const HeadDeptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String },
  hod: { type: String }
}, { timestamps: true })

const SubDeptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  headDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'HeadDepartment' },
  hod: { type: String }
}, { timestamps: true })

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, { timestamps: true })

const HeadDepartment = mongoose.model('HeadDepartment', HeadDeptSchema)
const SubDepartment = mongoose.model('SubDepartment', SubDeptSchema)
const Group = mongoose.model('Group', GroupSchema)

export { HeadDepartment, SubDepartment, Group }
