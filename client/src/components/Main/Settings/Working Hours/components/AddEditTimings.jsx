import React, { useEffect, useState } from "react"
import { IoCloseSharp } from "react-icons/io5"
import axios from "axios"
import { toast } from "react-toastify"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100"
const API = `${API_URL}/api/break-times`

const emptyForm = {
  shiftName: "",
  shiftHour: "",
  shiftStart: "",
  shiftEnd: "",
  breakInTime: "",
  breakOutTime: "",
}

const AddEditTimings = ({
  isOpen,
  onClose,
  isEdit,
  timing,
  refreshList
}) => {
  const [form, setForm] = useState(emptyForm)
  const [initialForm, setInitialForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (isEdit && timing) {
      const data = {
        shiftName: timing.shiftName || "",
        shiftHour: timing.shiftHour || "",
        shiftStart: timing.shiftStart || "",
        shiftEnd: timing.shiftEnd || "",
        breakInTime: timing.breakInTime || "",
        breakOutTime: timing.breakOutTime || "",
      }
      setForm(data)
      setInitialForm(data)
    } else {
      setForm(emptyForm)
      setInitialForm(null)
    }
    setErrors({})
  }, [isEdit, timing, isOpen])

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  /* ================= VALIDATION ================= */
  const validate = () => {
    const newErrors = {}

    if (!form.shiftName.trim())
      newErrors.shiftName = "Shift name is required"

    if (!form.shiftHour)
      newErrors.shiftHour = "Shift hours are required"

    if (!form.shiftStart)
      newErrors.shiftStart = "Shift start time is required"

    if (!form.shiftEnd)
      newErrors.shiftEnd = "Shift end time is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* ================= CHANGE DETECTION ================= */
  const isFormUnchanged = () => {
    return JSON.stringify(form) === JSON.stringify(initialForm)
  }

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    if (isEdit && isFormUnchanged()) {
      toast.error("Nothing updated")
      return
    }

    try {
      setLoading(true)

      if (isEdit) {
        const id = timing?._id || timing?.id
        await axios.put(`${API}/${id}`, form)
        toast.success("Break updated successfully")
      } else {
        await axios.post(API, form)
        toast.success("Break added successfully")
      }

      refreshList()
      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-lg p-4">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Break Time" : "Add Break Time"}
          </h2>
          <button onClick={onClose}>
            <IoCloseSharp size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">

          {/* Shift Name & Hours */}
          <div className="grid grid-cols-2 gap-3">
            <InputText
              label="Shift Name"
              name="shiftName"
              value={form.shiftName}
              onChange={handleChange}
              error={errors.shiftName}
            />

            <InputText
              label="Shift Hours"
              name="shiftHour"
              type="number"
              value={form.shiftHour}
              onChange={handleChange}
              error={errors.shiftHour}
            />
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-3">
            <InputTime
              label="Shift Start Time"
              name="shiftStart"
              value={form.shiftStart}
              onChange={handleChange}
              error={errors.shiftStart}
            />
            <InputTime
              label="Shift End Time"
              name="shiftEnd"
              value={form.shiftEnd}
              onChange={handleChange}
              error={errors.shiftEnd}
            />
          </div>

          {/* Break Time */}
          <div className="grid grid-cols-2 gap-3">
            <InputTime
              label="Break Start Time"
              name="breakInTime"
              value={form.breakInTime}
              onChange={handleChange}
              required={false}
            />
            <InputTime
              label="Break End Time"
              name="breakOutTime"
              value={form.breakOutTime}
              onChange={handleChange}
              required={false}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg
                       hover:bg-gray-800 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEdit
              ? "Update Break"
              : "Add Break"}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ================= INPUT COMPONENTS ================= */

const InputText = ({ label, error, ...props }) => (
  <div>
    <label className="block mb-1 font-medium">{label}  <span className="text-red-500">*</span></label>
    <input
      className={`w-full border px-3 py-2 rounded
        ${error ? "border-red-500" : ""}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

const InputTime = ({ label, error, required = true, ...props }) => (
  <div>
    <label className="block mb-1 font-medium">{label}{required ? <span className="text-red-500">*</span> : ''}</label>
    <input
      type="time"
      className={`w-full border px-3 py-2 rounded
        ${error ? "border-red-500" : ""}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

export default AddEditTimings
