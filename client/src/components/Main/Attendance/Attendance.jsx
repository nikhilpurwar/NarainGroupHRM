import React, { useEffect, useState } from "react"
import axios from "axios"
import AttendanceFilter from "./components/AttendanceFilter"
import EmployeeSummary from "./components/EmployeeSummary"
import AttendanceTable from "./components/AttendanceTable"
import { toast } from "react-toastify"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const API = `${API_URL}/api/attendance-report`

const Attendance = () => {
  const [filters, setFilters] = useState({
    search: "",
    month: "",
    year: "2025",
  })

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  // Load random employee initially
  useEffect(() => {
    fetchReport({})
  }, [])

  const fetchReport = async (params) => {
    try {
      setLoading(true)
      const res = await axios.get(API, { params })
      setReport(res.data)
    } catch {
      toast.error("Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchReport(filters)
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      <h3 className="text-2xl font-semibold mb-4">
        Attendance Report - ({filters.month || "Random"} {filters.year})
      </h3>

      <AttendanceFilter
        filters={filters}
        setFilters={setFilters}
        onSearch={handleSearch}
      />

      {loading && (
        <div className="text-center py-10">Loading...</div>
      )}

      {!loading && report && (
        <div className="bg-white rounded-xl shadow p-4">
          <EmployeeSummary emp={report.employee} />

          <AttendanceTable
            days={report.days}
            data={report.table}
          />
        </div>
      )}
    </div>
  )
}

export default Attendance