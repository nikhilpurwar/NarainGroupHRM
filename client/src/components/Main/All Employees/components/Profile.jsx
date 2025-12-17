import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { MdKeyboardBackspace } from "react-icons/md"
import { FiPhone, FiMail, FiUser, FiBriefcase, FiUsers } from "react-icons/fi"

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/employees`

const Profile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/${id}/profile`)
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
    return <div className="p-10 text-center text-gray-500">Loading profile...</div>
  }

  if (!emp) {
    return <div className="p-10 text-center text-red-500">Employee not found</div>
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
      >
        <MdKeyboardBackspace size={26} />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6">

        {/* Top Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          <div className='flex items-center gap-10'>
            {/* Avatar */}
            <img
              src={emp.avatar || 'https://ui-avatars.com/api/?name=' + emp.name}
              alt="avatar"
              className="w-32 h-32 rounded-full border-4 border-indigo-200 object-cover"
            />

            {/* Basic Info */}
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-800">{emp.name}</h2>
              <p className="text-sm text-gray-500 mt-1">Employee ID: {emp.empId}</p>

              {/* Contact */}
              <div className="mt-4 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <FiPhone className="text-indigo-500" />
                  {emp.mobile || 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  <FiMail className="text-indigo-500" />
                  {emp.email || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Barcode */}
          <div className="flex items-center justify-center mr-16">
            {emp.barcode && (
              <div className="bg-gray-50">
                <img src={emp.barcode} alt="barcode" className="w-60 object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <hr className="my-6" />

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Work Info */}
          <div className="border rounded-xl p-5 hover:shadow transition">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-800">
              <FiBriefcase className="text-indigo-500" />
              Work Information
            </h3>

            <div className="space-y-2 text-sm text-gray-700">
              <p><span className="font-medium">Department:</span> {emp.headDepartment?.name || emp.headDepartment || emp.department || 'N/A'}</p>
              <p><span className="font-medium">Sub Department:</span> {emp.subDepartment?.name || emp.subDepartment || 'N/A'}</p>
              <p><span className="font-medium">Group:</span> {emp.group?.name || emp.group || 'N/A'}</p>
              <p><span className="font-medium">Designation:</span> {emp.designation?.name || 'N/A'}</p>
              <p><span className="font-medium">Shift:</span> {emp.shift}</p>
              <p><span className="font-medium">Salary:</span> ₹{emp.salary}</p>
            </div>
          </div>

          {/* QR & Barcode */}
          {emp.qrCode && (
            <div className="row-span-2 flex justify-center items-center rounded-lg">
              <img src={emp.qrCode} alt="qrcode" className="w-sm object-contain" />
            </div>
          )}

          {/* Attendance Summary */}
          <div className="border rounded-xl p-5 hover:shadow transition">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-800">
              <FiUsers className="text-indigo-500" />
              Attendance Summary
            </h3>

            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Total Records:</span>{' '}
                {emp.attendance ? emp.attendance.length : 0}
              </p>
              <p>
                <span className="font-medium">Last Record:</span>{' '}
                {emp.attendance?.length
                  ? new Date(emp.attendance.at(-1).date).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}

export default Profile
