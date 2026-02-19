import React, { useEffect, useState } from "react"
import axios from "axios"
import { IoCloseSharp } from "react-icons/io5"
import { MdOutlineRemoveRedEye } from "react-icons/md"
import { IoMdEyeOff } from "react-icons/io"
import { toast } from "react-toastify"
import { useGlobalLoading } from "../../../../../hooks/useGlobalLoading"
import { useDispatch } from "react-redux"
import { startLoading, stopLoading } from "../../../../../store/loadingSlice"

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/users`
const EMP_API = `${API_URL}/api/employees`

const AddEditUsers = ({ isOpen, onClose, isEdit, user, refreshList }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Admin",
    password: "",
  })

  // const [loading, setLoading] = useState(false)
  const loading = useGlobalLoading()
  const dispatch = useDispatch()
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isEdit && user) {
      const firstName = (user.name || '').split(' ')[0] || 'User'
      setForm({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "admin",
        password: `${firstName}@123`,
      })
      setSelectedEmployeeId("")
    } else {
      setForm({ name: "", email: "", role: "admin", password: "" })
      setSelectedEmployeeId("")
    }
    setShowPassword(false)
  }, [isEdit, user])

  // Load employees when modal opens so we can select from employee list
  useEffect(() => {
    if (!isOpen) return

    const loadEmployees = async () => {
      try {
        const res = await axios.get(EMP_API)
        setEmployees(res.data?.data || [])
      } catch (e) {
        console.error('Failed to load employees for user mapping', e)
      }
    }

    loadEmployees()
  }, [isOpen])

  // Try to preselect employee when editing, based on email or name match
  useEffect(() => {
    if (!isOpen || !isEdit || !user || !employees.length) return
    const match = employees.find(emp => (
      emp.empId === user.email ||
      emp.email === user.email ||
      emp.name === user.name
    ))
    if (match) {
      setSelectedEmployeeId(match._id)
    }
  }, [isOpen, isEdit, user, employees])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value
    setSelectedEmployeeId(empId)
    const emp = employees.find(x => x._id === empId)
    if (!emp) return

    const firstName = (emp.name || '').split(' ')[0] || ''
    setForm(prev => ({
      ...prev,
      name: emp.name || '',
      email: emp.empId || emp.email || '',
      // Default password pattern: FirstName@123 when creating
      password: !isEdit ? `${firstName}@123` : prev.password || `${firstName}@123`,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // setLoading(true)
      dispatch(startLoading())
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
      // setLoading(false)
      dispatch(stopLoading())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card-hover bg-white rounded-xl shadow-xl w-[90%] max-w-md p-4">

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
            <label className="block text-sm font-medium">User Type</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="admin">Admin</option>
              <option value="gate">Gate</option>
              <option value="account">Account</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Employee (Name | EmpID | Sub Department)</label>
            <select
              name="employeeId"
              value={selectedEmployeeId}
              onChange={handleEmployeeSelect}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} | {emp.empId || '-'} | {emp.subDepartment?.name || '-'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Employee ID/Email
              <span className="text-red-500">*</span>
            </label>
            <input
              type=""
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Password
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border px-3 py-2 rounded pr-10"
              />
              <span
                className="absolute right-3 top-2.5 cursor-pointer text-gray-500"
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <IoMdEyeOff size={20} /> : <MdOutlineRemoveRedEye size={20} />}
              </span>
            </div>
          </div>

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

export default React.memo(AddEditUsers)
