import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

const API = 'http://localhost:3001/api/employees'

const Input = ({ label, name, value, onChange, readOnly, type = "text", error }) => (
  <div>
    <label className="block font-medium mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className={`w-full border p-3 rounded-lg ${
        error ? "border-red-500" : ""
      } ${readOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
)


const Select = ({ label, name, value, onChange, options, error }) => (
  <div>
    <label className="block font-medium mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full border p-3 rounded-lg ${error ? "border-red-500" : ""}`}
    >
      <option value="">Select</option>
      {options.map((op) => (
        <option key={op} value={op}>{op}</option>
      ))}
    </select>
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
)


const defaultForm = {
    firstName: '',
    lastName: '',
    fatherName: '',
    motherName: '',
    email: '',
    mobile: '',
    address: '',
    pincode: '',
    gender: '',
    maritalStatus: '',
    salary: '',
    workHours: '',
    salaryPerHour: '',
    empType: '',
    shift: '',
    headDepartment: '',
    subDepartment: '',
    group: '',
    deductions: [],
    empId: '',
    status: 'active',
    avatar: null,
}

const AddEditEmployee = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [form, setForm] = useState(defaultForm)
    const [errors, setErrors] = useState({})
    const [preview, setPreview] = useState(null)
    const [formError, setFormError] = useState('')

    useEffect(() => {
        if (!isEdit) return
        const fetchEmployee = async () => {
            try {
                const res = await axios.get(`${API}/${id}`)
                const emp = res.data.data
                // split name into first/last if possible
                const [firstName, ...rest] = (emp.name || '').split(' ')
                const lastName = rest.join(' ')
                setForm((f) => ({
                    ...f,
                    firstName: firstName || '',
                    lastName: lastName || '',
                    fatherName: emp.fatherName || '',
                    motherName: emp.motherName || '',
                    email: emp.email || '',
                    mobile: emp.mobile || '',
                    address: emp.address || '',
                    pincode: emp.pincode || '',
                    gender: emp.gender || '',
                    maritalStatus: emp.maritalStatus || '',
                    salary: emp.salary || '',
                    workHours: emp.workHours || '',
                    salaryPerHour: emp.salaryPerHour || '',
                    empType: emp.empType || '',
                    shift: emp.shift || '',
                    headDepartment: emp.department || '',
                    subDepartment: emp.subDepartment || '',
                    group: emp.group || '',
                    deductions: emp.deductions || [],
                    empId: emp.empId || '',
                    status: emp.status || 'active',
                    avatar: emp.avatar || null,
                }))
                if (emp.avatar) setPreview(emp.avatar)
            } catch (err) {
                console.error(err)
                const msg = err?.message || ''
                if (err.code === 'ECONNREFUSED' || msg.toLowerCase().includes('network')) {
                    setFormError('Cannot connect to backend (http://localhost:3001). Start the server and try again.')
                } else {
                    setFormError('Failed to load employee')
                }
                toast.error(formError || 'Failed to load employee')
            }
        }
        fetchEmployee()
    }, [id, isEdit])

    // compute salaryPerHour on render if not provided

    const handleChange = (e) => {
        const { name, value, checked } = e.target
        if (name === 'deductions') {
            setForm((f) => {
                const next = checked ? [...f.deductions, value] : f.deductions.filter((d) => d !== value)
                return { ...f, deductions: next }
            })
            return
        }
        if (name === 'avatar') {
            const file = e.target.files[0]
            if (file) {
                setForm((f) => ({ ...f, avatar: file }))
                const reader = new FileReader()
                reader.onload = () => setPreview(reader.result)
                reader.readAsDataURL(file)
            }
            return
        }
        setForm({ ...form, [name]: value })
        setErrors((prev) => ({ ...prev, [name]: undefined }))
    }

    const validate = () => {
        const err = {}
        if (!form.firstName.trim()) err.firstName = 'First name is required'
        if (!form.lastName.trim()) err.lastName = 'Last name is required'
        if (!form.salary || Number(form.salary) <= 0) err.salary = 'Salary must be a positive number'
        if (!form.workHours || Number(form.workHours) <= 0) err.workHours = 'Work hours must be a positive number'
        if (!/^[0-9]{10}$/.test(form.mobile || '')) err.mobile = 'Enter a valid 10-digit mobile number'
        if (!form.headDepartment) err.headDepartment = 'Select head department'
        return err
    }

    const toBase64 = (file) => new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result)
        reader.onerror = (e) => rej(e)
        reader.readAsDataURL(file)
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
            const err = validate()
            if (Object.keys(err).length) {
                setErrors(err)
                // scroll to first error field
                const firstKey = Object.keys(err)[0]
                setTimeout(() => {
                    const el = document.querySelector(`[name="${firstKey}"]`)
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        el.focus && el.focus()
                    }
                }, 50)
                return
            }

        try {
            const payload = {
                name: `${form.firstName} ${form.lastName}`.trim(),
                fatherName: form.fatherName,
                motherName: form.motherName,
                email: form.email,
                mobile: form.mobile,
                address: form.address,
                pincode: form.pincode,
                gender: form.gender,
                maritalStatus: form.maritalStatus,
                salary: Number(form.salary) || 0,
                workHours: Number(form.workHours) || 0,
                salaryPerHour: Number(form.salaryPerHour) || 0,
                empType: form.empType,
                shift: form.shift,
                department: form.headDepartment,
                subDepartment: form.subDepartment,
                group: form.group,
                deductions: form.deductions,
                empId: form.empId,
                status: form.status,
            }

            if (form.avatar && form.avatar instanceof File) {
                payload.avatar = await toBase64(form.avatar)
            } else if (form.avatar) {
                payload.avatar = form.avatar
            }

            // generate employee id when adding
            if (!isEdit && (!form.empId || !form.empId.trim())) {
                try {
                    const listRes = await axios.get(API)
                    const count = (listRes.data && listRes.data.data && listRes.data.data.length) || 0
                    const seq = count + 1
                    const yy = new Date().getFullYear() % 100
                    const padded = String(seq).padStart(4, '0')
                    payload.empId = `RPM-${yy}-${padded}`
                } catch (genErr) {
                    console.warn('Failed to generate empId', genErr)
                }
            }

            if (isEdit) {
                await axios.put(`${API}/${id}`, payload)
                toast.success('Employee updated')
            } else {
                await axios.post(API, payload)
                toast.success('Employee added')
            }
            setFormError('')
            setErrors({})
            navigate(-1)
        } catch (err) {
            console.error(err)
            const msg = err?.response?.data?.message || err?.message || 'Save failed'
            // network/backend unreachable
            if (err.code === 'ECONNREFUSED' || (err.message && err.message.toLowerCase().includes('network'))) {
                setFormError('Cannot connect to backend (http://localhost:3001). Start the server and try again.')
            } else if (err.response && err.response.data && err.response.data.errors) {
                // server-side validation errors
                setErrors(err.response.data.errors)
                setFormError('Please fix the validation errors below.')
            } else {
                setFormError(msg)
            }
            toast.error(msg)
        }
    }

    const computedSalaryPerHour = (() => {
        const s = parseFloat(form.salary) || 0
        const w = parseFloat(form.workHours) || 0
        if (!form.salaryPerHour && w > 0) return (s / w).toFixed(2)
        return form.salaryPerHour || ''
    })()

    return (
        <div className="p-6 bg-white">
            {/* <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">{isEdit ? 'Edit Employee' : 'Add Employee'}</h2>
                <button className="text-sm text-gray-600" onClick={() => navigate(-1)}>✕</button>
            </div> */}

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* ERROR BANNER */}
                {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                        {formError}
                    </div>
                )}

                {/* AVATAR */}
                <div className="bg-gray-50 p-6 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                        Profile Image
                    </h3>

                    <input type="file" accept="image/*" onChange={handleChange} name="avatar" />
                    {preview && (
                        <img
                            src={preview}
                            className="mt-4 w-28 h-28 rounded-full border object-cover"
                        />
                    )}
                </div>

                {/* PERSONAL INFO */}
                <div className="bg-gray-100 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                    <h3 className="text-white bg-gray-900 font-semibold text-lg rounded-t-xl p-4">
                        Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        <Input label="First Name*" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} />
                        <Input label="Last Name*" name="lastName" value={form.lastName} onChange={handleChange} error={errors.lastName} />
                        <Input label="Mobile*" name="mobile" value={form.mobile} onChange={handleChange} error={errors.mobile} />
                        <Input label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} />
                        <Input label="Father Name" name="fatherName" value={form.fatherName} onChange={handleChange} />
                        <Input label="Mother Name" name="motherName" value={form.motherName} onChange={handleChange} />

                        <Select label="Gender" name="gender" value={form.gender} onChange={handleChange} options={["Male", "Female", "Other"]} />
                        <Select label="Marital Status" name="maritalStatus" value={form.maritalStatus} onChange={handleChange} options={["Single", "Married"]} />

                        <Input label="Address" name="address" value={form.address} onChange={handleChange} />
                        <Input label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />
                    </div>
                </div>

                {/* WORK INFO */}
                <div className="bg-gray-100 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                    <h3 className="text-white bg-gray-900 font-semibold text-lg rounded-t-xl p-4">
                        Work Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        {/* <Input label="Employee ID" name="empId" /> */}

                        <Select
                            label="Head Department*"
                            name="headDepartment"
                            value={form.headDepartment}
                            onChange={handleChange}
                            options={["OFFICE STAFF", "PLANT"]}
                            error={errors.headDepartment}
                        />

                        <Select
                            label="Sub Department"
                            name="subDepartment"
                            value={form.subDepartment}
                            onChange={handleChange}
                            options={["GENERAL MANAGER", "OPRATION MANAGER"]}
                        />

                        <Select
                            label="Employee Group"
                            name="group"
                            value={form.group}
                            onChange={handleChange}
                            options={["senior-staff", "junior-staff"]}
                        />

                        <Select
                            label="Shift"
                            name="shift"
                            value={form.shift}
                            onChange={handleChange}
                            options={["8-hour", "9-hour", "10-hour", "12-hour"]}
                        />

                        <Select
                            label="Salary Type"
                            name="empType"
                            value={form.empType}
                            onChange={handleChange}
                            options={["Fixed Salary", "Hourly Salary"]}
                        />
                    </div>
                </div>

                {/* SALARY */}
                <div className="bg-gray-100 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                    <h3 className="text-white bg-gray-900 font-semibold text-lg rounded-t-xl p-4">
                        Salary & Deductions
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        <Input label="Salary*" name="salary" type="number" value={form.salary} onChange={handleChange} error={errors.salary} />
                        <Input label="Work Hours*" name="workHours" value={form.workHours} onChange={handleChange} error={errors.workHours} />
                        <Input
                            label="Salary Per Hour"
                            name="salaryPerHour"
                            value={computedSalaryPerHour}
                            readOnly
                        />
                    </div>

                    {/* DEDUCTIONS */}
                    <div className="p-4">
                        <p className="font-medium mb-2">Deductions</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            {["pf", "lwf", "ptax", "esi", "tds", "insurance"].map((d) => (
                                <label key={d} className="flex items-center gap-2">
                                    <input type="checkbox" name="deductions" value={d} onChange={handleChange} />
                                    {d.toUpperCase()}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>


                {/* ACTIONS */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-lg bg-gray-200 hover:bg-gray-300"
                    >
                        Back
                    </button>

                    <button
                        type="submit"
                        className="px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-700"
                    >
                        {isEdit ? "Update Employee" : "Add Employee"}
                    </button>
                </div>
            </form>

        </div>
    )
}

export default AddEditEmployee
