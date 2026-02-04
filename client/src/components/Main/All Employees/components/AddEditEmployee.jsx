import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { MdKeyboardBackspace } from "react-icons/md"
import { useHierarchy } from '../../../../context/HierarchyContext'
import { useDispatch } from 'react-redux'
import { fetchEmployees } from '../../../../store/employeesSlice'
import { Loader } from 'lucide-react'
import { FaFilePdf } from "react-icons/fa";
import Spinner from '../../../utility/Spinner'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/employees`
const DEDUCTION_API = `${API_URL}/api/charges`
const SHIFT_API = `${API_URL}/api/break-times`

const Input = ({label,name,value,onChange,type = "text",error,required = false,prefix,suffix,}) => (
  <div> 
    <label className="block font-medium mb-1 text-gray-800">{label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {prefix && (<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{prefix}</span>)}
      <input type={type} name={name} value={value} onChange={onChange} className={`w-full border p-3 rounded-lg ${ prefix ? "pl-12" : "" } ${error ? "border-red-500" : ""}`} />
      {suffix && (<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"> {suffix}</span>)}
    </div>
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

const Select = ({ label, name, value, onChange, options, error ,required=false, }) => (
    <div>
        <label className="block font-medium mb-1 text-gray-800">
      <span>{label}</span>
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
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
    empType: '',
    shift: '',
    headDepartment: '',
    subDepartment: '',
    designation: '',
    deductions: [], //which deductions applied
    empId: '',
    status: 'active',
    avatar: null,
    vehicleNumber: '',
    vehicleName: '',
    vehicleDocument: null,
    vehicleInsuranceExpiry: ''
    
}

const AddEditEmployee = () => {

    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)
    const { headDepartments, getSubDepartmentsByHead, getDesignationsBySubDepartment } = useHierarchy()
    const dispatch = useDispatch()

    const [form, setForm] = useState(defaultForm)
    const [employees, setEmployees] = useState([])
    const [deductions, setDeductions] = useState([])
    const [shifts, setShifts] = useState([])
    const [errors, setErrors] = useState({})
    const [preview, setPreview] = useState(null)
    const [formError, setFormError] = useState('')
    const submittingRef = useRef(false)
    const [editLoaded, setEditLoaded] = useState(!isEdit)

    const DRAFT_KEY = 'addEmployeeFormDraft'
    const [hasLoadedDraft, setHasLoadedDraft] = useState(false)

    // Filter lists based on hierarchy
    const filteredSubDepts = form.headDepartment
        ? getSubDepartmentsByHead(form.headDepartment)
        : []

    const filteredDesignations = form.subDepartment
        ? getDesignationsBySubDepartment(form.subDepartment)
        : []

         const selectedSubDept = filteredSubDepts.find(
  s => s._id === form.subDepartment
)

const isDriver = selectedSubDept?.name?.toLowerCase() === 'driver'

    useEffect(() => {
        // fetch employees for "reportsTo" dropdown
        const fetchEmployees = async () => {
            try {
                const res = await axios.get(API)
                setEmployees(res.data?.data || [])
            } catch (e) {
                console.error('Failed to fetch employees:', e)
            }
        }
        fetchEmployees()

        if (!isEdit) return
const fetchEmployee = async () => {
  try {
    const res = await axios.get(`${API}/${id}`)
    const emp = res.data.data

    const [firstName, ...rest] = (emp.name || '').split(' ')
    const lastName = rest.join(' ')

    setForm({
      ...defaultForm,   // important — clean base
      firstName,
      lastName,
      fatherName: emp.fatherName || '',
      motherName: emp.motherName || '',
      email: emp.email || '',
      mobile: emp.mobile || '',
      address: emp.address || '',
      pincode: emp.pincode || '',
      gender: emp.gender || '',
      maritalStatus: emp.maritalStatus || '',
      salary: emp.salary || '',
      empType: emp.empType || '',
      shift: emp.shift || '',
      headDepartment: emp.headDepartment?._id || '',
      subDepartment: emp.subDepartment?._id || '',
      designation: emp.designation?._id || '',
      deductions: emp.deductions || [],
      empId: emp.empId || '',
      status: emp.status || 'active',

      avatar: emp.avatar || null,

      vehicleNumber: emp.vehicleInfo?.vehicleNumber || '',
      vehicleName: emp.vehicleInfo?.vehicleName || '',
      vehicleDocument: emp.vehicleInfo?.vehicleDocument || null,
      vehicleInsuranceExpiry: emp.vehicleInfo?.insuranceExpiry
        ? emp.vehicleInfo.insuranceExpiry.split('T')[0]
        : ''
    })

    if (emp.avatar) setPreview(emp.avatar)

    setEditLoaded(true)   // ✅ NOW form can render

  } catch (err) {
    toast.error('Failed to load employee')
                console.error(err)
                const msg = err?.message || ''
                if (err.code === 'ECONNREFUSED' || msg.toLowerCase().includes('network')) {
                    setFormError(`Cannot connect to backend (${API_URL}). Start the server and try again.`)
                } else {
                    setFormError('Failed to load employee')
                }
                toast.error(formError || 'Failed to load employee')
            }
            if (isDriver && form.vehicleDocument instanceof File) {
 const formData = new FormData()

Object.entries(payload).forEach(([key, value]) => {
  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value))
  } else {
    formData.append(key, value)
  }
})

if (form.vehicleDocument) {
  formData.append('vehicleDocument', form.vehicleDocument)
}

const res = await axios.post(API, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
}
        }
        fetchEmployee()
    }, [id, isEdit])

    // fetch deduction list
    useEffect(() => {
        const fetchDeductions = async () => {
            try {
                const res = await axios.get(DEDUCTION_API)
                setDeductions(res.data?.data || [])
            } catch (e) {
                toast.error('Failed to fetch deductions:', e)
            }
        }
        fetchDeductions()
    }, [])

    // fetch shift list
    useEffect(() => {
        const fetchShifts = async () => {
            try {
                const res = await axios.get(SHIFT_API)
                setShifts(res.data?.data || [])
            } catch (e) {
                toast.error('Failed to fetch shifts:', e)
            }
        }
        fetchShifts()
    }, [])

    // Load draft for Add mode from sessionStorage (if any)
    useEffect(() => {
        if (isEdit) return
        try {
            const raw = sessionStorage.getItem(DRAFT_KEY)
            if (!raw) return
            const saved = JSON.parse(raw)
            if (saved && typeof saved === 'object') {
                const { avatar: _ignoredAvatar, ...rest } = saved
                setForm(f => ({ ...f, ...rest }))
            }
        } catch (e) {
            console.warn('Failed to restore add-employee draft from sessionStorage', e)
        } finally {
            setHasLoadedDraft(true)
        }
    }, [isEdit])

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
        if (name === "mobile") {
            const digitsOnly = value.replace(/\D/g, "");
            const limitedTo10 = digitsOnly.slice(0, 10);
            setForm((prev) => ({ ...prev, mobile: limitedTo10 }));
            return;
        }
         if (name === 'vehicleDocument') {
  const file = e.target.files[0]
  if (file && file.type === 'application/pdf') {
    setForm(prev => ({ ...prev, vehicleDocument: file }))
  } else {
    toast.error('Only PDF files are allowed')
  }
  return
}

        setForm({ ...form, [name]: value })
        setErrors((prev) => ({ ...prev, [name]: undefined }))
    }

    // Remove avatar
    // const handleRemoveAvatar = () => {
    //     setForm(f => ({ ...f, avatar: null }))
    //     setPreview(null)
    // }

    // Persist draft to sessionStorage in real time for Add mode
    useEffect(() => {
        if (isEdit) return
        if (!hasLoadedDraft) return
        try {
            const { avatar, ...rest } = form
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest))
        } catch (e) {
            console.warn('Failed to save add-employee draft to sessionStorage', e)
        }
    }, [form, isEdit, hasLoadedDraft])

    const validate = () => {
        const err = {}
        if (!form.firstName.trim()) err.firstName = 'First name is required'
        // if (!form.lastName.trim()) err.lastName = 'Last name is required'
        if (!form.salary || Number(form.salary) <= 0) err.salary = 'Salary must be a positive number'
        if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) err.email = 'Enter a valid email address'
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

      useEffect(() => {
    if (location.state?.scrollTo === "vehicle-info") {
      document
        .getElementById("vehicle-info")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (submittingRef.current) return
        const err = validate()
        if (Object.keys(err).length) {
            setErrors(err)
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

        submittingRef.current = true
        setLoading(true)

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
                empType: form.empType,
                shift: form.shift,
                headDepartment: form.headDepartment,
                subDepartment: form.subDepartment,
                designation: form.designation,
                deductions: form.deductions,
                empId: form.empId,
                status: form.status,
                
                ...(isDriver && {
  vehicleInfo: {
    vehicleNumber: form.vehicleNumber,
    vehicleName: form.vehicleName,
    insuranceExpiry: form.vehicleInsuranceExpiry,
    // Preserve existing vehicleDocument if not uploading a new file
    ...(isEdit && form.vehicleDocument && typeof form.vehicleDocument === 'string' && {
      vehicleDocument: form.vehicleDocument
    })
  }
}),
}

            // Handle avatar: only include if changed
            if (form.avatar instanceof File) {
                payload.avatar = await toBase64(form.avatar)
            } else if (isEdit && form.avatar === null && preview === null) {
                // Avatar was removed in edit mode
                payload.avatar = null
            } else if (!isEdit && form.avatar) {
                // New employee with existing avatar string
                payload.avatar = form.avatar
            }
            
            // Handle vehicle document for drivers - use FormData for file upload OR if driver has existing vehicle info
            if (isDriver && (form.vehicleDocument instanceof File || (isEdit && form.vehicleDocument))) {
                const formData = new FormData()
                
                Object.entries(payload).forEach(([key, value]) => {
                    if (key === 'deductions' && Array.isArray(value)) {
                        // Handle deductions array properly - append each item separately
                        value.forEach(deduction => {
                            formData.append('deductions[]', deduction)
                        })
                    } else if (typeof value === 'object' && value !== null) {
                        formData.append(key, JSON.stringify(value))
                    } else {
                        formData.append(key, value)
                    }
                })
                
                // Only append file if it's a new file upload
                if (form.vehicleDocument instanceof File) {
                    formData.append('vehicleDocument', form.vehicleDocument)
                }
                
                if (isEdit) {
                    await axios.put(`${API}/${id}`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    })
                } else {
                    await axios.post(API, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    })
                }
            } else {
                if (isEdit) {
                    const res = await axios.put(`${API}/${id}`, payload)
                } else {
                    await axios.post(API, payload)
                }
            }
            
            toast.success(isEdit ? 'Employee updated' : 'Employee added')

            try { dispatch(fetchEmployees()) } catch (e) { }
            try { sessionStorage.removeItem(DRAFT_KEY) } catch (e) { }
            setFormError('')
            setErrors({})
//             navigate(-1)
//                   const updatedEmployee = res.data

// // If insurance is now valid → remove its notification
// if (new Date(updatedEmployee.vehicleInsuranceExpiry) > new Date()) {
//   setInsuranceAlerts(prev =>
//     prev.filter(n => n.emp._id !== updatedEmployee._id)
//   )
// } 
navigate(-1, { state: { insuranceUpdated: id } })

        } catch (err) {
            console.error(err)
            const msg = err?.response?.data?.message || err?.message || 'Save failed'
            if (err.code === 'ECONNREFUSED' || (err.message && err.message.toLowerCase().includes('network'))) {
                setFormError(`Cannot connect to backend (${API_URL}). Start the server and try again.`)
            } else if (err.response && err.response.data && err.response.data.errors) {
                setErrors(err.response.data.errors)
                setFormError('Please fix the validation errors below.')
            } else {
                setFormError(msg)
            }
            toast.error(msg)
        } finally {
            submittingRef.current = false
            setLoading(false)
        }
    }

//   const getInsuranceStatus = (expiry) => {
//     if (!expiry) return null;

//     const today = new Date();
//     const exp = new Date(expiry);

//     const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

//     if (days < 0) return "expired";
//     if (days <= 15) return "warning";
//     return "valid";
//   };

  const forceOpenVehicle = location.state?.openVehicle;
//   const insuranceStatus = getInsuranceStatus(form.vehicleInsuranceExpiry);
 
// if (!editLoaded) {
//   return (
//     <div className="flex items-center justify-center h-[70vh]">
//       <S size={32} />
//       <span className="ml-3 font-medium">Loading employee...</span>
//     </div>
//   )
// }
 if  (!editLoaded){
    return (
      <div className="p-6 text-center">
        <Spinner />
      </div>
    );
}


    return (
        <div className="p-6 bg-white">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
            >
                <MdKeyboardBackspace size={26} />
                <span className="text-sm font-medium">Back</span>
            </button>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* PERSONAL INFO */}
                <div className="bg-gray-100 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                    <h3 className="text-white bg-gray-900 font-semibold text-lg rounded-t-xl p-4">
                        Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        {/* AVATAR */}
                        {/* AVATAR */}
<div className="row-span-2">
    <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Profile Image
    </h3>
<div className="flex items-center justify-center gap-6">
        {preview ? (
            <img
                src={preview}
                alt="Profile Preview"
                className="w-30 h-30 rounded-full border-2 border-gray-300 shadow-sm object-cover"
            />
        ) : (
            <div className="w-30 h-30 flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400">
                <span className="text-sm">No Image</span>
            </div>
        )}

        <div className="flex flex-col gap-2">
            <label
                htmlFor="avatar"
                className="cursor-pointer px-4 py-2 bg-gray-900 text-white rounded-md shadow hover:bg-gray-700 transition text-center"
            >
                Upload Image
            </label>

            {preview && (
                <button
                    type="button"
                    onClick={() => {
                        // remove locally
                        setForm(f => ({ ...f, avatar: null }));
                        setPreview(null);
                    }}
                    className="px-4 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm"
                >
                    Remove Image
                </button>
            )}
        </div>

        <input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleChange}
            name="avatar"
            className="hidden"
        />
</div>
                        </div>

                        <Input label="First Name" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} required />
                        <Input label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} error={errors.lastName}/>
                        <Input label="Mobile" name="mobile" value={form.mobile} onChange={handleChange} required error={errors.mobile} prefix="+91" suffix={
                        <span style={{ color: !form.mobile? "#999": form.mobile.length === 10 ? "green": "red",}}> ({form.mobile?.length || 0}/10)</span>}/>
                        <Input label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} required/>
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
                        {/* Head Department */}
                        <div>
                           
                            <label className="block font-medium mb-1 text-gray-800"><span>Head Department</span>  <span className="text-red-500 ml-1">*</span> </label>
                            <select
                                name="headDepartment"
                                value={form.headDepartment}
                                onChange={(e) => {
                                    handleChange(e)
                                    // Reset dependent fields
                                    setForm(f => ({ ...f, subDepartment: '', group: '', designation: '' }))
                                }}
                                className={`w-full border p-3 rounded-lg ${errors.headDepartment ? 'border-red-500' : ''}`}
                                required
                            >
                                <option value="">Select Head Department</option>
                                {headDepartments.map(h => (
                                    <option key={h._id} value={h._id}>{h.name}</option>
                                ))}
                            </select>
                            {errors.headDepartment && <p className="text-red-500 text-sm mt-1">{errors.headDepartment}</p>}
                        </div>

                        {/* Sub Department - Cascaded */}
                        <div>
                                 <label className="block font-medium mb-1 text-gray-800"><span>Sub Department</span>  <span className="text-red-500 ml-1">*</span> </label>
                          
                            <select
                                name="subDepartment"
                                value={form.subDepartment}
                                onChange={(e) => {
                                    handleChange(e)
                                    // Reset designation when sub-dept changes
                                    setForm(f => ({ ...f, designation: '' }))
                                }}
                                disabled={!form.headDepartment}
                                className={`w-full border p-3 rounded-lg ${errors.subDepartment ? 'border-red-500' : ''}`}
                                required
                            >
                                <option value="">Select Sub Department</option>
                                {filteredSubDepts.map(s => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Designation - Cascaded */}
                        <div>
                               <label className="block font-medium mb-1 text-gray-800"><span>Designation</span>  <span className="text-red-500 ml-1">*</span> </label>
                          
                            <select
                                name="designation"
                                value={form.designation}
                                onChange={handleChange}
                                disabled={!form.subDepartment}
                                className="w-full border p-3 rounded-lg disabled:bg-gray-200"
                                required
                            >
                                <option value="">Select Designation</option>
                                {filteredDesignations.map(d => (
                                    <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <Select
                            label="Shift"
                            name="shift"
                            value={form.shift}
                            onChange={handleChange}
                            options={shifts.map(s => `${s.shiftName} (${s.shiftHour} hours)`)}
                        />
                    </div>
                </div>

                  {isDriver && (forceOpenVehicle || true) && (
          <div
            id="vehicle-info"
            className="bg-gray-100 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.4)] scroll-mt-24"
          >            <h3 className="text-white bg-gray-900 font-semibold text-lg rounded-t-xl p-4">
                        Vehicle Info
                    </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
  
 <div className="md:col-span-3 bg-gray-100 rounded-lg">

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Input
        label="Vehicle Number"
        name="vehicleNumber"
        value={form.vehicleNumber}
        onChange={handleChange}
        required
      />

      <Input
        label="Vehicle Name"
        name="vehicleName"
        value={form.vehicleName}
        onChange={handleChange}
        required
      />
      <Input
  label="Insurance Expiry Date"
  name="vehicleInsuranceExpiry"
  type="date"
  value={form.vehicleInsuranceExpiry}
  onChange={handleChange}
  required
/>
         {/* {insuranceStatus === "valid" && (
                        <span className="absolute rigaht-3 top-9 text-green-600 font-bold">
                          ✓ Done
                        </span>
                      )}

                      {insuranceStatus === "warning" && (
                        <span className="absolute right-3 top-9 text-orange-600 font-semibold">
                          Expiring soon
                        </span>
                      )}

                      {insuranceStatus === "expired" && (
                        <span className="absolute right-3 top-9 text-red-600 font-semibold">
                          Expired
                        </span>
                      )} */}
<div>
  <label className="block font-medium mb-1 text-gray-800">
    Vehicle Document (PDF)
    <span className="text-red-500 ml-1">*</span>
  </label>

  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:border-gray-600 transition-all bg-gray-50">

    <input
      type="file"
      accept="application/pdf"
      name="vehicleDocument"
      id="vehicleDocument"
      onChange={handleChange}
      className="hidden"
    />

    {/* Show existing PDF in edit mode */}
    {isEdit && form.vehicleDocument && typeof form.vehicleDocument === 'string' && (
      <div className="flex items-center justify-between bg-blue-50 px-3.5 py-1.5 mb-2">
        <div className="flex items-center gap-3">
          <FaFilePdf className="text-red-600 text-xl flex-shrink-0" />
          <span className="text-sm text-gray-800">Existing Document</span>
        </div>
        <a
          href={form.vehicleDocument}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 text-sm font-medium hover:text-blue-800 transition"
        >
          View PDF
        </a>
      </div>
    )}

    {/* Show this only if no new PDF is uploaded */}
    {!(form.vehicleDocument instanceof File) && (
      <label
        htmlFor="vehicleDocument"
        className="cursor-pointer inline-flex items-center justify-between w-full gap-4"
      >
        <div className="flex items-center gap-2">
          <FaFilePdf className="text-red-600 text-xl" />
          <p className="text-xs text-gray-500">Only PDF • Max 5MB</p>
        </div>
        <span className="px-3.5 py-1.5 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-700 transition">
          {isEdit && form.vehicleDocument ? 'Replace PDF' : 'Upload PDF'}
        </span>
      </label>
    )}

    {/* Show newly uploaded PDF */}
    {form.vehicleDocument instanceof File && (
      <div className="flex items-center justify-between bg-gray-50 px-3.5 py-1.5">
        <div className="flex items-center gap-3 overflow-hidden">
          <FaFilePdf className="text-red-600 text-xl flex-shrink-0" />
          <span className="text-sm text-gray-800 truncate">
            {form.vehicleDocument.name}
          </span>
        </div>
        <button
          type="button"
          className="text-red-600 text-sm font-medium hover:text-red-800 transition"
          onClick={() => setForm(f => ({ ...f, vehicleDocument: isEdit ? f.vehicleDocument : null }))}
        >
          Remove
        </button>
      </div>
    )}
  </div>

  {errors.vehicleDocument && (
    <p className="text-red-500 text-sm mt-1">{errors.vehicleDocument}</p>
  )}
</div>



  </div>
</div>
          </div>
             </div> )}

                {/* SALARY */}
                <div className="bg-gray-100 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                    <h3 className="text-white bg-gray-900 font-semibold text-lg rounded-t-xl p-4">
                        Salary & Deductions
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        <Select
                            label="Salary Type"
                            name="empType"
                            value={form.empType}
                            onChange={handleChange}
                            options={["Monthly Salary", "Daily Salary"]}
                            required

                        />
                        <Input label="Salary" name="salary" type="number" value={form.salary} onChange={handleChange} error={errors.salary} required/>
                    </div>

                    {/* DEDUCTIONS */}
                    <div className="p-4">
                        <p className="font-medium mb-2">Deductions</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            {deductions.map((d) => (
                                <label key={d._id}  className="flex items-center gap-2 font-bold">
                                    <input
                                        title={d.value_type === 'INR' ? `${d.value}₹` : `${d.value}%`}
                                        type="checkbox"
                                        name="deductions"
                                        value={d.deduction}
                                        onChange={handleChange}
                                        checked={form.deductions.includes(d.deduction)}
                                    />
                                    {d.deduction.toUpperCase()}
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
                    {!isEdit && (
                        <button type="reset"
                            onClick={() => {
                                setForm(defaultForm)
                                setErrors({})
                                setPreview(null)
                                setFormError('')
                                // try { sessionStorage.removeItem(DRAFT_KEY) } catch (e) { }
                            }}
                            className="px-6 py-3 rounded-lg bg-gray-900 hover:bg-gray-700 text-white"
                        >
                            Reset
                            
                        </button>
                    )}
                   <button
                   type="submit"
                   disabled={loading}
                   className="px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-700 flex items-center justify-center"
>
  {loading ? (
    <>
      <Loader className="mr-2" size={16} />
      Saving...
    </>
  ) : (
    isEdit ? "Update Employee" : "Add Employee"
  )}
</button>

                </div>
            </form>

        </div>
    )
}

export default AddEditEmployee