import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'account', 'gate'], 
    default: 'account',
    lowercase: true
  },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  passwordChangedAt: { type: Date }
}, { timestamps: true })

UserSchema.index({ email: 1, isActive: 1 })
UserSchema.index({ role: 1, isActive: 1 })
UserSchema.index({ employee: 1 })

const User = mongoose.model('User', UserSchema)
export default User
