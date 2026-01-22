import React, { useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { IoCloseSharp, IoCloudUploadOutline } from "react-icons/io5"
import { Loader } from "lucide-react"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5100"

const AddEditAdvance = ({ data, onClose, onSuccess }) => {
  const isEdit = Boolean(data)

  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  

  const [form, setForm] = useState({
    employee: "",
    date: "",
    type: "advance",
    amount: "",
    instalment: "",
    reason: "",
    start_from: "",
    attachment: null,
  })

  const toggleDropdown = () => {
  if (isEdit) return
  setShowDropdown((prev) => !prev)
}

  const dropdownRef = useRef(null)
const inputRef = useRef(null)


  const [errors, setErrors] = useState({})

  /* ================= PREFILL (EDIT MODE) ================= */
  useEffect(() => {
    if (data) {
      setForm({
        employee: data.employee?._id || "",
        date: data.date ? data.date.split("T")[0] : "",
        type: data.type || "",
        amount: data.amount || "",
        instalment: data.instalment || "",
        reason: data.reason || "",
        start_from: data.start_from || "",
        attachment: null,
      })
       setSearch(
      data.employee
        ? `${data.employee.name} | ${data.employee.empId}`
        : ""
    );
    }
  }, [data])

  /* ================= EMPLOYEE SEARCH ================= */
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get(`${API}/api/employees`, {
          params: { search },
        })
        setEmployees(res.data?.data || [])
      } catch {
        toast.error("Failed to load employees")
      }
    }
    fetchEmployees()
  }, [search])

  /* ================= AUTO INSTALLMENT CALC ================= */
  const installmentAmount =
    form.type === "loan" && form.amount && form.instalment
      ? (Number(form.amount) / Number(form.instalment)).toFixed(2)
      : ""

  /* ================= VALIDATION ================= */
  const validate = () => {
    const e = {}

    if (!form.employee) e.employee = "Employee is required"
    if (!form.date) e.date = "Date is required"
    if (!form.type) e.type = "Type is required"
    if (!form.amount) e.amount = "Amount is required"

    if (form.type === "loan") {
      if (!form.instalment) e.instalment = "Installments required"
      if (!form.reason) e.reason = "Text about is required"
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ================= FILE HANDLER ================= */
  const handleFileChange = (file) => {
    if (!file) return

    const allowed = ["image/jpeg", "image/png", "application/pdf"]
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG or PDF allowed")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB")
      return
    }

    setForm({ ...form, attachment: file })
  }

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)

      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== "") fd.append(k, v)
      })

      if (isEdit) {
        await axios.put(`${API}/api/advance/${data._id}`, fd)
        toast.success("Advance updated successfully")
      } else {
        await axios.post(`${API}/api/advance`, fd)
        toast.success("Advance added successfully")
      }

      onSuccess?.()
      onClose()
    } catch {
      toast.error("Operation failed")
    } finally {
      setLoading(false)
    }
  }
useEffect(() => {
  const handleClickOutside = (e) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target)
    ) {
      setShowDropdown(false)
    }
  }

  document.addEventListener("mousedown", handleClickOutside)
  return () => document.removeEventListener("mousedown", handleClickOutside)
}, [])


const filteredEmployees = useMemo(() => {
  const q = search.toLowerCase().trim()
  if (!q) return employees

  return employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(q) ||
      emp.empId?.toLowerCase().includes(q)
  )
}, [employees, search])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
      <div className="card-hover bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 main-scroll">

        {/* HEADER */}
        <div className="flex justify-between items-center pb-3 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Advance / Loan" : "Add Advance / Loan"}
          </h2>
          <button onClick={onClose}>
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

         {/* EMPLOYEE */}
<div className="relative" ref={dropdownRef}>
  <label className="text-sm font-medium">
              Select Employee
              <span className="text-red-500">*</span>
            </label>
<input
  ref={inputRef}
  type="text"
  placeholder="Select or search by name or emp id..."
  value={search}
  disabled={isEdit}
  onClick={toggleDropdown}
  onChange={(e) => {
    setSearch(e.target.value)
    setShowDropdown(true)
  }}
  className={`w-full border rounded px-3 py-2 ${
    errors.employee ? "border-red-500" : ""
  }`}
/>


  {/* DROPDOWN */}
  {showDropdown && !isEdit && (
    <div
      className="absolute z-50 left-0 right-0 mt-1
                 bg-white border rounded-lg
                 shadow-lg max-h-56 overflow-auto"
    >
      {filteredEmployees.length ? (
        filteredEmployees.map((emp) => (
          <div
            key={emp._id}
            onClick={() => {
              setForm((f) => ({ ...f, employee: emp._id }))
              setSearch(`${emp.name} | ${emp.empId}`)
              setShowDropdown(false)
            }}
            className="px-4 py-3 cursor-pointer
                       hover:bg-indigo-50 transition"
          >
            <p className="font-medium text-sm">{emp.name}</p>
            <p className="text-xs text-gray-500">{emp.empId}</p>
          </div>
        ))
      ) : (
        <div className="py-4 text-center text-sm text-gray-400">
          No employees found
        </div>
      )}
    </div>
  )}

  {errors.employee && (
    <p className="text-red-500 text-xs mt-1">
      {errors.employee}
    </p>
  )}
</div>


          {/* DATE */}
          <div>
          <label className="text-sm font-medium">
              Date
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={`w-full border rounded px-3 py-2 ${errors.date ? "border-red-500" : ""
                }`}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            {errors.date && (
              <p className="text-red-500 text-xs">{errors.date}</p>
            )}
          </div>

          {/* TYPE */}
          <div>
             <label className="text-sm font-medium">
              Type
              <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6 mt-1">
              <label className="flex gap-2 items-center">
                <input
                  type="radio"
                  checked={form.type === "loan"}
                  onChange={() => setForm({ ...form, type: "loan" })}
                />
                Loan
              </label>
              <label className="flex gap-2 items-center">
                <input
                  type="radio"
                  checked={form.type === "advance"}
                  onChange={() => setForm({ ...form, type: "advance" })}
                />
                Advance
              </label>
            </div>
          </div>

          {/* AMOUNT */}
          <div>
             <label className="text-sm font-medium">
              Amount
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full border rounded px-3 py-2 ${errors.amount ? "border-red-500" : ""
                }`}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          {/* LOAN ONLY FIELDS */}
          {form.type === "loan" && (
            <>
              {/* INSTALLMENTS */}
              <div>
               <label className="text-sm font-medium">
              Installments
              <span className="text-red-500">*</span>
            </label> <input
                  type="number"
                  className={`w-full border rounded px-3 py-2 ${errors.instalment ? "border-red-500" : ""
                    }`}
                  value={form.instalment}
                  onChange={(e) =>
                    setForm({ ...form, instalment: e.target.value })
                  }
                />
                {errors.instalment && (
                  <p className="text-red-500 text-xs">{errors.instalment}</p>
                )}
              </div>

              {/* INSTALLMENT AMOUNT */}
              <div>
                <label className="text-sm font-medium">
                  Installment Amount
                </label>
                <input
                  readOnly
                  value={installmentAmount}
                  className="relative w-full border rounded px-3 py-2 bg-gray-100"
                />
                <p className="absolute top-1/2 right-0 text-xs text-gray-500">
                  / month
                </p>
              </div>

              {/* TEXT ABOUT */}
              <div>
               <label className="text-sm font-medium"> Text About
              <span className="text-red-500">*</span>
            </label><textarea
                  rows={3}
                  className={`w-full border rounded px-3 py-2 ${errors.reason ? "border-red-500" : ""
                    }`}
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value })
                  }
                />
                {errors.reason && (
                  <p className="text-red-500 text-xs">{errors.reason}</p>
                )}
              </div>

              {/* START FROM */}
              <div>
                <label className="text-sm font-medium">Start From</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={form.start_from}
                  onChange={(e) =>
                    setForm({ ...form, start_from: e.target.value })
                  }
                />
              </div>

              {/* ATTACHMENT */}
              <div>
                <label className="text-sm font-medium">Attachment</label>
                <label className="flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <IoCloudUploadOutline size={26} />
                  <span className="text-sm text-gray-600">
                    {form.attachment?.name || "Upload Image or PDF"}
                  </span>
                  <input
                    type="file"
                    hidden
                    onChange={(e) =>
                      handleFileChange(e.target.files[0])
                    }
                  />
                </label>
                <p className="text-xs text-gray-500">
                  JPG, PNG, PDF • Max 5MB
                </p>
              </div>
            </>
          )}

          {/* SUBMIT */}
          <button
            disabled={loading}
            className="bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? (
                <>
                 
                  Saving...
                </>
              ) : (
                isEdit
                ? "Update Advance"
                : "Add Advance"
              )}
               
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddEditAdvance
