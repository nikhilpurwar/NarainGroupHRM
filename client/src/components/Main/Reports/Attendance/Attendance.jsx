import React from 'react'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
const API = `${API_URL}/api/attendances`

const Attendance = () => {
  return (
    <div>Attendance</div>
  )
}

export default Attendance