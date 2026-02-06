import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  MdKeyboardBackspace,
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdWork,
  MdAttachMoney,
  MdSchedule,
  MdVerified,
  MdPerson,
  MdFamilyRestroom,
  MdCake,
  MdCreditCard,
  MdQrCode,
  MdDownload,
  MdPrint,
  MdShare,
  MdEdit,
  MdDirectionsCar
} from "react-icons/md"
import {
  FiUser,
  FiBriefcase,
  FiUsers,
  FiCalendar,
  FiTag,
  FiFileText
} from "react-icons/fi"
import {
  TbGenderMale,
  TbGenderFemale,
  TbHeartHandshake
} from "react-icons/tb"
import { IoDocumentTextOutline } from "react-icons/io5"
import { CiBarcode } from "react-icons/ci";
import { FaRupeeSign } from "react-icons/fa";
import ViewSalaryReport from '../../Reports/Monthly Salary/components/ViewSalaryReport';
// import '../../utility/print.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/employees`

const Profile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('personal')
  const [showSalaryReport, setShowSalaryReport] = useState(false)
  const printRef = useRef(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await axios.get(`${API}/${id}/profile`, { headers })
        setEmp(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!emp) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdPerson className="text-red-500 text-4xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Employee not found</h3>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateTenure = () => {
    if (!emp.createdAt) return 'N/A'
    const startDate = new Date(emp.createdAt)
    const now = new Date()
    const diffInMonths = (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth())

    if (diffInMonths < 1) {
      return '< 1 month'
    } else if (diffInMonths < 12) {
      return `${diffInMonths} months`
    } else {
      const years = Math.floor(diffInMonths / 12)
      const months = diffInMonths % 12
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`
    }
  }

  const handlePrint = () => {
    try {
      const content = printRef.current ? printRef.current.innerHTML : null
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) return

      // Include current document styles (both <link> and <style>) so printed preview matches app
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(n => n.outerHTML).join('\n')

      printWindow.document.open()
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Profile - ${emp.name}</title>${styles}<style>body{margin:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111}</style></head><body>${content || '<div>Nothing to print</div>'}</body></html>`)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => { try { printWindow.print() } catch (e) { /* ignore */ } }, 400)
    } catch (err) {
      console.error('Print preview failed, falling back to window.print()', err)
      window.print()
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${emp.name} - Profile`,
          text: `Employee Profile: ${emp.name} (${emp.empId})`,
          url: window.location.href
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Profile link copied to clipboard!')
    }
  }

  const handleDownloadBarcode = () => {
    const link = document.createElement('a')
    link.href = emp.barcode
    link.download = `${emp.empId}_barcode.png`
    link.click()
  }

  const handleDownloadProfile = () => {
    window.print()
  }

  const isDriver =
  emp.designation?.name?.toLowerCase() === 'driver' ||
  emp.empType?.toLowerCase() === 'driver'

  const getInsuranceStatus = (expiryDate) => {
  if (!expiryDate) {
    return { label: 'Not Available', color: 'text-gray-500 bg-gray-100' }
  }

  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Expired', color: 'text-red-600 bg-red-50' }
  }

  if (diffDays <= 15) {
    return { label: 'Expiring Soon', color: 'text-orange-600 bg-orange-50' }
  }

  return { label: 'Active', color: 'text-green-600 bg-green-50' }
}

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 p-4 md:p-6 screen-only">

        {/* Header with Back Button */}
        <div className="max-w-7xl mx-auto mb-6 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-indigo-50 transition-colors">
                <MdKeyboardBackspace size={20} />
              </div>
              <span className="text-sm font-medium">Back to Employees</span>
            </button>

            <div className="flex items-center gap-3 no-print">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <MdPrint size={18} />
                <span className="text-sm font-medium">Print</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <MdShare size={18} />
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Profile Container */}
        <div className="max-w-7xl mx-auto">

          {/* Profile Header Card */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-xl p-6 md:p-8 mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              {/* Avatar Section */}
              <div className="relative">
                <div className="relative">
                  <img
                    src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=fff&size=256`}
                    alt={emp.name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-white/30 shadow-2xl object-cover"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                    <MdVerified size={12} />
                    {emp.status === 'active' ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{emp.name}</h1>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <FiBriefcase />
                        {emp.designation?.name || 'N/A'}
                      </span>
                      <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <MdWork />
                        {emp.headDepartment?.name || 'N/A'}
                      </span>
                      <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <FiCalendar />
                        Since {formatDate(emp.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl md:text-3xl font-bold mb-1">₹{emp.salary?.toLocaleString()}</div>
                    <p className="text-white/80 text-sm">Monthly Salary</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <MdPhone className="text-xl" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm">Phone</p>
                      <p className="font-medium">{emp.mobile || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <MdEmail className="text-xl" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm">Email</p>
                      <p className="font-medium truncate">{emp.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <MdLocationOn className="text-xl" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm">Address</p>
                      <p className="font-medium">{emp.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column - Personal Info */}
            <div className="lg:col-span-2 space-y-6">

              {/* Tabs Navigation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex border-b border-gray-200">
                  {['personal', 'work', 'documents'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {tab === 'personal' && 'Personal Information'}
                      {tab === 'work' && 'Work Details'}
                      {tab === 'documents' && 'Documents'}
                    </button>
                  ))}
                </div>

                {/* Personal Info Tab */}
                {activeTab === 'personal' && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                            <FiUser className="text-indigo-500" />
                            Personal Details
                          </h3>
                          <div className="space-y-3">
                            <InfoRow icon={<MdPerson />} label="Full Name" value={emp.name} />
                            <InfoRow icon={<MdCreditCard />} label="Employee ID" value={emp.empId} />
                            <InfoRow
                              icon={emp.gender === 'Male' ? <TbGenderMale /> : <TbGenderFemale />}
                              label="Gender"
                              value={emp.gender}
                            />
                            <InfoRow
                              icon={<MdFamilyRestroom />}
                              label="Marital Status"
                              value={emp.maritalStatus}
                            />
                            <InfoRow icon={<MdCake />} label="Date of Birth" value="Not specified" />
                          </div>
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                            <MdFamilyRestroom className="text-indigo-500" />
                            Family Details
                          </h3>
                          <div className="space-y-3">
                            <InfoRow icon={<FiUser />} label="Father's Name" value={emp.fatherName || 'N/A'} />
                            <InfoRow icon={<FiUser />} label="Mother's Name" value={emp.motherName || 'N/A'} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                            <MdLocationOn className="text-indigo-500" />
                            Contact Information
                          </h3>
                          <div className="space-y-3">
                            <InfoRow icon={<MdPhone />} label="Mobile" value={emp.mobile} />
                            <InfoRow icon={<MdEmail />} label="Email" value={emp.email} />
                            <InfoRow icon={<MdLocationOn />} label="Address" value={emp.address} />
                            <InfoRow icon={<FiTag />} label="Pincode" value={emp.pincode} />
                          </div>
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                            <FiCalendar className="text-indigo-500" />
                            Employment History
                          </h3>
                          <div className="space-y-3">
                            <InfoRow icon={<FiCalendar />} label="Joined On" value={formatDate(emp.createdAt)} />
                            <InfoRow icon={<MdWork />} label="Tenure" value={calculateTenure()} />
                            <InfoRow icon={<MdVerified />} label="Last Updated" value={formatDate(emp.updatedAt)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Details Tab */}
                {activeTab === 'work' && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                            <FiBriefcase className="text-indigo-500" />
                            Work Information
                          </h3>
                          <div className="space-y-3">
                            <InfoRow icon={<MdWork />} label="Main Department" value={emp.headDepartment?.name || emp.headDepartment} />
                            <InfoRow icon={<FiBriefcase />} label="Sub Department" value={emp.subDepartment?.name || emp.subDepartment} />
                            <InfoRow icon={<FiUser />} label="Designation" value={emp.designation?.name} />
                            <InfoRow icon={<FiTag />} label="Employee Type" value={emp.empType} />
                            <InfoRow icon={<MdSchedule />} label="Shift" value={emp.shift} />
                          </div>
                        </div>

                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                            <FaRupeeSign className="text-indigo-500" />
                            Salary Information
                          </h3>
                          <div className="space-y-3">
                            <InfoRow icon={<FaRupeeSign />} label="Monthly Salary" value={`₹${emp.salary?.toLocaleString()}`} />
                            <InfoRow icon={<FiCalendar />} label="Pay Cycle" value="Monthly" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                          <TbHeartHandshake className="text-indigo-500" />
                          Deductions & Benefits
                        </h3>
                        <div className="space-y-3">
                          {emp.deductions?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {emp.deductions.map((deduction, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium flex items-center gap-2"
                                >
                                  <FiTag size={12} />
                                  {deduction.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500">No deductions specified</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="p-6  bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                          <CiBarcode className="text-indigo-500" />
                          Identification Codes
                        </h3>
                        <div className="space-y-4">
                          {emp.barcode && (
                            <div className="bg-white p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-700">Barcode</span>
                                <button onClick={handleDownloadBarcode} className="p-1 hover:bg-gray-200 rounded">
                                  <MdDownload size={18} />
                                </button>
                              </div>
                              <img src={emp.barcode} alt="Barcode" className="w-full h-auto" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                          <MdQrCode className="text-indigo-500" />
                          QR Code
                        </h3>
                        {emp.qrCode ? (
                          <div className="bg-white p-4 rounded-lg border flex flex-col items-center">
                            <img src={emp.qrCode} alt="QR Code" className="w-48 h-48" />
                            <p className="text-sm text-gray-500 mt-2">Scan for employee details</p>
                          </div>
                        ) : (
                          <p className="text-gray-500">No QR code available</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance Summary Card */}
              {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                  <FiCalendar className="text-indigo-500" />
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Records"
                    value={emp.attendance?.length || 0}
                    color="bg-blue-50 text-blue-600"
                    icon={<FiCalendar />}
                  />
                  <StatCard
                    title="Last Attendance"
                    value={emp.attendance?.length ? new Date(emp.attendance.at(-1).date).toLocaleDateString() : 'N/A'}
                    color="bg-green-50 text-green-600"
                    icon={<MdVerified />}
                  />
                  <StatCard
                    title="Tenure"
                    value={calculateTenure()}
                    color="bg-purple-50 text-purple-600"
                    icon={<FiCalendar />}
                  />
                </div>
              </div> */}

{/* Vehicle Details (Only for Driver) */}
{isDriver && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
      <MdDirectionsCar className="text-indigo-500" />
      Vehicle Details
    </h3>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

      <StatCard
        title="Vehicle Name"
        value={emp.vehicleInfo?.vehicleName || 'N/A'}
        color="bg-indigo-50 text-indigo-600"
        icon={<MdDirectionsCar />}
      />

      <StatCard
        title="Vehicle Number"
        value={emp.vehicleInfo?.vehicleNumber || 'N/A'}
        color="bg-blue-50 text-blue-600"
        icon={<MdCreditCard />}
      />

      <StatCard
        title="Insurance Status"
        value={(() => {
          const status = getInsuranceStatus(emp.vehicleInfo?.insuranceExpiry)
          return status.label
        })()}
        color={(() => {
          const status = getInsuranceStatus(emp.vehicleInfo?.insuranceExpiry)
          return status.label === 'Expired'
            ? 'bg-red-50 text-red-600'
            : status.label === 'Expiring Soon'
              ? 'bg-orange-50 text-orange-600'
              : 'bg-green-50 text-green-600'
        })()}
        icon={<FiCalendar />}
      />

    </div>

    {/* Insurance expiry date + document */}
    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
      <span className="text-gray-600">
        Insurance Expiry:{' '}
        <strong>
          {emp.vehicleInfo?.insuranceExpiry
            ? formatDate(emp.vehicleInfo.insuranceExpiry)
            : 'N/A'}
        </strong>
      </span>

      {emp.vehicleInfo?.vehicleDocument && (
        <a
          href={`${API_URL}${emp.vehicleInfo.vehicleDocument}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
        >
          <MdDownload />
          View Document
        </a>
      )}
    </div>
  </div>
)}


            </div>

            {/* Right Column - Quick Info & Actions */}
            <div className="space-y-6 no-print">

              {/* Status Card */}
              {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                <MdVerified className="text-indigo-500" />
                Employment Status
              </h3>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${emp.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                }`}>
                <div className={`w-2 h-2 rounded-full ${emp.status === 'active' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                <span className="font-medium">{emp.status?.toUpperCase()}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Employee is currently {emp.status === 'active' ? 'active and working' : 'inactive'}
              </p>
            </div> */}

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                  <IoDocumentTextOutline className="text-indigo-500" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => { navigate(`/attendence-report?employeeId=${emp._id}`) }}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="font-medium text-gray-700">View Attendance</span>
                    <FiCalendar className="text-gray-400" />
                  </button>
                  <button onClick={() => setShowSalaryReport(true)} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="font-medium text-gray-700">Salary Slips</span>
                    <FaRupeeSign className="text-gray-400" />
                  </button>
                  <button onClick={() => navigate('/leave-management')} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="font-medium text-gray-700">Leave Records</span>
                    <FiCalendar className="text-gray-400" />
                  </button>
                  {/* <button onClick={handleDownloadProfile} className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors">
                  <span className="font-medium">Download Profile</span>
                  <MdDownload className="text-indigo-500" />
                </button> */}
                </div>
              </div>

              {/* Employee ID Card Preview */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-6 text-white">
                <div className="text-center mb-4">

                  <div className="w-18 h-18 bg-white/20 rounded-full flex items-center justify-center shadow-2xl mx-auto mb-3">
                    {emp.avatar ? (
                      <img
                        src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=fff&size=256`}
                        alt={emp.name}
                        className="w-18 h-18 rounded-full border-4 border-white/30 shadow-2xs object-cover "
                      />
                    ) : (
                      <FiUser size={24}/>
                    )
                    }
                  </div>
                  <h4 className="text-lg font-bold mb-1">{emp.name}</h4>
                  <p className="text-white/80 text-sm">{emp.designation?.name || 'Employee'}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-white/20 pb-2">
                    <span className="text-white/70 text-sm">ID:</span>
                    <span className="font-mono font-bold">{emp.empId}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/20 pb-2">
                    <span className="text-white/70 text-sm">Dept:</span>
                    <span>{emp.headDepartment?.name || emp.headDepartment}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Valid Until:</span>
                    <span>Dec 2026</span>
                  </div>
                </div>

                {emp.barcode && (
                  <div className="mt-4 py-4 bg-gray-400 rounded flex justify-center">
                    <img src={emp.barcode} alt="ID QR" className="w-60" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Print-Only View */}
        <div className="print-only" ref={printRef}>
          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #4f46e5', paddingBottom: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: '0' }}>EMPLOYEE PROFILE</h1>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0 0' }}>Generated on {new Date().toLocaleDateString()}</p>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <img
              src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=fff&size=256`}
              alt={emp.name}
              style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{emp.name}</h2>
              <p style={{ margin: '3px 0', fontSize: '14px' }}><strong>Employee ID:</strong> {emp.empId}</p>
              <p style={{ margin: '3px 0', fontSize: '14px' }}><strong>Designation:</strong> {emp.designation?.name || 'N/A'}</p>
              <p style={{ margin: '3px 0', fontSize: '14px' }}><strong>Department:</strong> {emp.headDepartment?.name || 'N/A'}</p>
              <p style={{ margin: '3px 0', fontSize: '14px' }}><strong>Status:</strong> {emp.status === 'active' ? 'Active' : 'Inactive'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>₹{emp.salary?.toLocaleString()}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0 0' }}>Monthly Salary</p>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Personal Information</h3>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: '500' }}>Full Name:</td>
                  <td style={{ padding: '8px 0' }}>{emp.name}</td>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: '500' }}>Gender:</td>
                  <td style={{ padding: '8px 0' }}>{emp.gender}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Marital Status:</td>
                  <td style={{ padding: '8px 0' }}>{emp.maritalStatus}</td>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Father's Name:</td>
                  <td style={{ padding: '8px 0' }}>{emp.fatherName || 'N/A'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Mother's Name:</td>
                  <td style={{ padding: '8px 0' }}>{emp.motherName || 'N/A'}</td>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Mobile:</td>
                  <td style={{ padding: '8px 0' }}>{emp.mobile}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Email:</td>
                  <td style={{ padding: '8px 0' }}>{emp.email}</td>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Pincode:</td>
                  <td style={{ padding: '8px 0' }}>{emp.pincode}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Address:</td>
                  <td colSpan="3" style={{ padding: '8px 0' }}>{emp.address}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Work Information</h3>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: '500' }}>Main Department:</td>
                  <td style={{ padding: '8px 0' }}>{emp.headDepartment?.name || emp.headDepartment}</td>
                  <td style={{ padding: '8px 0', width: '30%', fontWeight: '500' }}>Sub Department:</td>
                  <td style={{ padding: '8px 0' }}>{emp.subDepartment?.name || emp.subDepartment}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Designation:</td>
                  <td style={{ padding: '8px 0' }}>{emp.designation?.name}</td>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Employee Type:</td>
                  <td style={{ padding: '8px 0' }}>{emp.empType}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Shift:</td>
                  <td style={{ padding: '8px 0' }}>{emp.shift}</td>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Monthly Salary:</td>
                  <td style={{ padding: '8px 0' }}>₹{emp.salary?.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Joined On:</td>
                  <td style={{ padding: '8px 0' }}>{formatDate(emp.createdAt)}</td>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Tenure:</td>
                  <td style={{ padding: '8px 0' }}>{calculateTenure()}</td>
                </tr>
                {emp.deductions?.length > 0 && (
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: '500' }}>Deductions:</td>
                    <td colSpan="3" style={{ padding: '8px 0' }}>{emp.deductions.join(', ').toUpperCase()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Attendance Summary</h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 5px 0' }}>Total Records</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>{emp.attendance?.length || 0}</p>
              </div>
              <div style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 5px 0' }}>Last Attendance</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{emp.attendance?.length ? new Date(emp.attendance.at(-1).date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 5px 0' }}>Tenure</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{calculateTenure()}</p>
              </div>
            </div>
          </div>

          {(emp.barcode || emp.qrCode) && (
            <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              {emp.barcode && (
                <div style={{ display: 'inline-block', marginRight: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '500', marginBottom: '5px' }}>Barcode</p>
                  <img src={emp.barcode} alt="Barcode" style={{ maxWidth: '200px', height: 'auto' }} />
                </div>
              )}
              {emp.qrCode && (
                <div style={{ display: 'inline-block' }}>
                  <p style={{ fontSize: '12px', fontWeight: '500', marginBottom: '5px' }}>QR Code</p>
                  <img src={emp.qrCode} alt="QR Code" style={{ width: '100px', height: '100px' }} />
                </div>
              )}
            </div>
          )}
        </div>

        <ViewSalaryReport
          isOpen={showSalaryReport}
          onClose={() => setShowSalaryReport(false)}
          employee={{
            empName: emp?.name,
            empId: emp?.empId,
            department: emp?.headDepartment?.name || emp?.headDepartment,
            group: emp?.subDepartment?.name || emp?.subDepartment,
            salary: emp?.salary
          }}
          monthYear="Current Month"
          onPay={() => { }}
          onDownloadPDF={() => { }}
        />
      </div>
    </>
  )
}

// Helper Components
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <span className="text-gray-600">{label}</span>
    </div>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
)

const StatCard = ({ title, value, color, icon }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-600">{title}</span>
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
    <div className="text-xl font-bold text-gray-900">{value}</div>
  </div>
)

export default Profile