import React, { useEffect, useState } from "react"
import { IoCloseSharp } from "react-icons/io5"
import axios from "axios"
import { toast } from "react-toastify"

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/break-times`

const AddEditTimings = ({ isOpen, onClose, isEdit, timing, refreshList }) => {
  const [form, setForm] = useState({
    shiftName: "",
    shiftHour: "",
    shiftStart: "",
    shiftEnd: "",
    breakInTime: "",
    breakOutTime: "",
    // nightIn: "",
    // nightOut: "",
  })

  const [loading, setLoading] = useState(false)

  /* ================= LOAD EDIT ================= */
  useEffect(() => {
    if (isEdit && timing) {
      setForm({
        shiftName: timing.shiftName || "",
        shiftHour: timing.shiftHour || "",
        shiftStart: timing.shiftStart || "",
        shiftEnd: timing.shiftEnd || "",
        breakInTime: timing.breakInTime || "",
        breakOutTime: timing.breakOutTime || "",
        // nightIn: timing.nightIn || "",
        // nightOut: timing.nightOut || "",
      })
    } else {
      setForm({
        shiftName: "",
        shiftHour: "",
        shiftStart: "",
        shiftEnd: "",
        breakInTime: "",
        breakOutTime: "",
        // nightIn: "",
        // nightOut: "",
      })
    }
  }, [isEdit, timing, isOpen])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault()
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
      console.error('Break save error', err)
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card-hover bg-white rounded-xl shadow-xl w-[90%] max-w-lg p-4">

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



          <div className="grid grid-cols-2 gap-3">
          {/* Shift Name */}
            <div>
            <label className="block mb-1 font-medium">Shift Name*</label>
            <input
              type="text"
              name="shiftName"
              value={form.shiftName}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded" required
            />
            </div>
          {/* Shift Hours */}
            <div>
            <label className="block mb-1 font-medium">Shift Hours*</label>
            <input
              type="number"
              name="shiftHour"
              value={form.shiftHour}
              onChange={handleChange} 
              className="w-full border px-3 py-2 rounded" required
            />
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shift Start Time" name="shiftStart" value={form.shiftStart} onChange={handleChange} required/>
            <Input label="Shift End Time" name="shiftEnd" value={form.shiftEnd} onChange={handleChange} required />
          </div>

          {/* Break */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Break Start Time" name="breakInTime" value={form.breakInTime} onChange={handleChange} required/>
            <Input label="Break End Time" name="breakOutTime" value={form.breakOutTime} onChange={handleChange} required/>
          </div>

          {/* Night */}
          {/* <div className="grid grid-cols-2 gap-3">
            <Input label="Night Start Time" name="nightIn" value={form.nightIn} onChange={handleChange} />
            <Input label="Night End Time" name="nightOut" value={form.nightOut} onChange={handleChange} />
          </div> */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Update Break" : "Add Break"}
          </button>
        </form>
      </div>
    </div>
  )
}

const Input = ({ label, ...props }) => (
  <div>
    <label className="block mb-1 font-medium">{label} *</label>
    <input
      type="time"
      className="w-full border px-3 py-2 rounded"
      {...props}
    />
  </div>
)

export default AddEditTimings
