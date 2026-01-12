import React, { useState } from 'react'
import { MdOutlineRemoveRedEye } from 'react-icons/md'
import { IoMdEyeOff } from 'react-icons/io'

const ChangePassword = ({ isOpen, onClose, initialEmail = '' }) => {
  const [form, setForm] = useState({
    email: initialEmail || '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
   // Eye icon toggles
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

  const validate = () => {
    const errs = {}
    if (!form.email) errs.email = 'Employee ID or Email is required'
    if (!form.oldPassword) errs.oldPassword = 'Old password is required'
    if (!form.newPassword) errs.newPassword = 'New password is required'
    else if (form.newPassword.length < 6) errs.newPassword = 'New password must be at least 6 characters'
    if (!form.confirmPassword) errs.confirmPassword = 'Confirm password is required'
    else if (form.confirmPassword !== form.newPassword) errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    try {
      setSubmitting(true)
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to change password')
      setErrors({ form: 'Password updated successfully. Please login with new password.' })
      setTimeout(() => {
        setForm({ email: initialEmail || '', oldPassword: '', newPassword: '', confirmPassword: '' })
        setErrors({})
        if (onClose) onClose()
      }, 1200)
    } catch (err) {
      // Show backend message (e.g. invalid id/email or wrong password)
      setErrors({ form: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black/80 via-gray-900/80 to-gray-800/80 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-8 border border-white/20 transform transition-all duration-300 scale-100 hover:scale-[1.01]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Change Password</h1>
          <p className="text-gray-200 text-sm mt-1">Update your password using Employee ID or Email</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Employee ID/Email</label>
            <input
              type="text"
              className={`text-gray-900 w-full rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/90 border ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Old Password</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                className={`text-gray-900 w-full rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/90 border ${errors.oldPassword ? 'border-red-500' : 'border-gray-300'}`}
                value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
              />
              <span
                className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
                onClick={() => setShowOld(prev => !prev)}
              >
                {showOld ? <IoMdEyeOff size={18} /> : <MdOutlineRemoveRedEye size={18} />}
              </span>
            </div>
            {errors.oldPassword && <p className="text-xs text-red-400 mt-1">{errors.oldPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className={`text-gray-900 w-full rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/90 border ${errors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
              <span
                className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
                onClick={() => setShowNew(prev => !prev)}
              >
                {showNew ? <IoMdEyeOff size={18} /> : <MdOutlineRemoveRedEye size={18} />}
              </span>
            </div>
            {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`text-gray-900 w-full rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/90 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
              <span
                className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
                onClick={() => setShowConfirm(prev => !prev)}
              >
                {showConfirm ? <IoMdEyeOff size={18} /> : <MdOutlineRemoveRedEye size={18} />}
              </span>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>}
          </div>

          {errors.form && (
            <p className={`text-sm mt-1 ${errors.form.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
              {errors.form}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 disabled:bg-indigo-400 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? 'Updating...' : 'Update Password'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 text-center text-xs text-gray-200 hover:text-white hover:underline"
          >
            Close
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword
