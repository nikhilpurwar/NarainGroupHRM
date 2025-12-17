import React, { useEffect, useState } from "react"
import axios from "axios"
import { IoCloseSharp } from "react-icons/io5"
import { toast } from "react-toastify"

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/users`

const AddEditUsers = ({ isOpen, onClose, isEdit, user, refreshList }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Admin",
    password: "",
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isEdit && user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "Admin",
        password: "",
      })
    } else {
      setForm({ name: "", email: "", role: "Admin", password: "" })
    }
  }, [isEdit, user])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)

      if (isEdit) {
        await axios.put(`${API}/${user._id || user.id}`, form)
        toast.success("User updated")
      } else {
        await axios.post(API, form)
        toast.success("User added")
      }

      refreshList()
      onClose()
    } catch {
      toast.error("Operation failed")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-md p-4">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit User" : "Add User"}
          </h2>
          <button onClick={onClose}>
            <IoCloseSharp size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">

          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">User Type</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="Admin">Admin</option>
              <option value="Gate">Gate</option>
              <option value="Account">Account</option>
            </select>
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800"
          >
            {loading ? "Saving..." : isEdit ? "Update User" : "Add User"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddEditUsers
