import React, { useState } from "react";
import ChangePassword from './ChangePassword'
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { IoMdEyeOff } from "react-icons/io";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  const validate = () => {
    let newErrors = {};

    if (!formData.email) {
      newErrors.email = "Employee ID or Email is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
  const [showChangePassword, setShowChangePassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login failed')
      // store token and user based on keepLoggedIn
      try {
        if (keepLoggedIn) {
          localStorage.setItem('token', data.data.token)
          localStorage.setItem('user', JSON.stringify(data.data.user))
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
          sessionStorage.removeItem('expiresAt')
        } else {
          const expiresAt = Date.now() + 2 * 60 * 1000 // 2 minutes
          sessionStorage.setItem('token', data.data.token)
          sessionStorage.setItem('user', JSON.stringify(data.data.user))
          sessionStorage.setItem('expiresAt', String(expiresAt))
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } catch {
        // ignore storage errors
      }
      // set default axios header (best-effort)
      try {
        const axios = (await import('axios')).default
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`
      } catch {
        // ignore axios init failures
      }
      // redirect
      window.location.href = '/'
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/10 transform transition-all duration-300 hover:scale-[1.01]">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-gray-200 text-sm mt-1">Sign in to continue to Narain HRM</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block font-medium text-gray-300 mb-1">
              Employee ID/Email
            </label>
            <input
              type="text"
              placeholder="Enter your Employee ID/Email"
              className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white/90 border ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={`w-full rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white/90 border ${
                  errors.password ? "border-red-500" : "border-gray-300"
                }`}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />

              {/* Show/Hide Password Toggle */}
              <span
                className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IoMdEyeOff size={20} /> : <MdOutlineRemoveRedEye size={20} />}
              </span>
            </div>

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Keep me logged in */}
          <div className="flex items-center justify-between text-sm text-gray-200">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                // checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Keep me logged in</span>
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 disabled:bg-indigo-400 text-white py-2.5 rounded-lg text-lg font-semibold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="inline-block h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? 'Logging in...' : 'Login'}
          </button>

          {/* Global form error (wrong ID/email or password) */}
          {errors.form && (
            <p className="text-sm text-red-400 mt-3 text-center">
              {errors.form}
            </p>
          )}

          {/* Change Password Link */}
          <div className="text-center text-sm text-gray-200 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowChangePassword(true)
              }}
              className="text-indigo-200 hover:text-white hover:underline"
            >
              Change Password
            </button>
          </div>

          {/* Footer */}
          {/* <p className="text-center text-sm text-gray-600 mt-4">
            Don’t have an account?
            <span className="text-blue-600 font-semibold cursor-pointer">
              {" "}
              Sign Up
            </span>
          </p> */}
        </form>
      </div>
      <ChangePassword
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        initialEmail={formData.email}
      />
    </div>
  );
};

export default Login;
