import mongoose from 'mongoose'

const permissionSchema = new mongoose.Schema({
  route: { type: String, required: true, unique: true },
  label: { type: String },
  allowedRoles: [{ type: String }],
}, { timestamps: true })

const Permission = mongoose.model('Permission', permissionSchema)

export default Permission
