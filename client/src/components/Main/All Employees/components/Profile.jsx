import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const API = `${API_URL}/api/employees`

const Profile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/${id}/profile`)
        setEmp(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) return <div className="p-6">Loading...</div>
  if (!emp) return <div className="p-6">Employee not found</div>

  return (
    <div className="p-6 bg-white rounded-xl">
      <div className="flex items-center gap-6">
        <img src={emp.avatar || '/'} alt="avatar" className="w-28 h-28 rounded-full object-cover border" />
        <div>
          <h2 className="text-2xl font-semibold">{emp.name}</h2>
          <p className="text-sm text-gray-600">{emp.empId}</p>
          <p className="text-sm mt-2">Mobile: {emp.mobile}</p>
          <p className="text-sm">Email: {emp.email}</p>
        </div>
        <div className="ml-auto flex gap-3">
          {emp.barcode && <img src={emp.barcode} alt="barcode" className="w-40 h-16 object-contain" />}
          {emp.qrCode && <img src={emp.qrCode} alt="qrcode" className="w-24 h-24 object-contain" />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h4 className="font-semibold mb-2">Work Info</h4>
          <p>Head Department: {emp.headDepartment || emp.department}</p>
          <p>Sub Department: {emp.subDepartment}</p>
          <p>Group: {emp.group}</p>
          <p>Shift: {emp.shift}</p>
          <p>Salary: ₹{emp.salary}</p>
        </div>

        <div className="p-4 border rounded">
          <h4 className="font-semibold mb-2">Attendance Summary</h4>
          <p>Total Records: {emp.attendance ? emp.attendance.length : 0}</p>
          <p>Last record: {emp.attendance && emp.attendance.length ? new Date(emp.attendance[emp.attendance.length-1].date).toLocaleString() : 'N/A'}</p>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded">Back</button>
      </div>
    </div>
  )
}

export default Profile
