import React, { useState, useEffect } from 'react'
import { IoCloseSharp } from 'react-icons/io5'

const ManualAttendanceModal = ({ isOpen, onClose, employees, onSubmit }) => {
  const todayIso = new Date().toLocaleDateString('en-CA')

  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(todayIso)
  const [inHour, setInHour] = useState('')
  const [inMinute, setInMinute] = useState('00')
  const [inMeridiem, setInMeridiem] = useState('AM')
  const [outHour, setOutHour] = useState('')
  const [outMinute, setOutMinute] = useState('00')
  const [outMeridiem, setOutMeridiem] = useState('PM')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setError('')
      setDate(todayIso)
      setInHour('')
      setInMinute('00')
      setInMeridiem('AM')
      setOutHour('')
      setOutMinute('00')
      setOutMeridiem('PM')
      // Preselect first employee if available
      if (employees && employees.length > 0) {
        setEmployeeId(employees[0]._id || employees[0].id || '')
      } else {
        setEmployeeId('')
      }
    }
  }, [isOpen, todayIso, employees])

  if (!isOpen) return null

  const isTodaySelected = date === todayIso

  const buildAmPmTime = (hourStr, minuteStr, meridiem) => {
    if (!hourStr) return ''
    const hNum = Number(hourStr)
    const mNum = Number(minuteStr || 0)
    if (!hNum || Number.isNaN(hNum)) return ''
    const hhStr = String(hNum).padStart(2, '0')
    const mmStr = String(Number.isNaN(mNum) ? 0 : mNum).padStart(2, '0')
    const mer = (meridiem || 'AM').toLowerCase()
    return `${hhStr}:${mmStr}:00 ${mer}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!employeeId) {
      setError('Please select an employee')
      return
    }
    if (!date) {
      setError('Please select a date')
      return
    }
    if (!inHour) {
      setError('Please enter Punch-In hour')
      return
    }
    if (!inMinute) {
      setError('Please enter Punch-In minute')
      return
    }
    if (!inMeridiem) {
      setError('Please select Punch-In AM/PM')
      return
    }

    const inTime = buildAmPmTime(inHour, inMinute, inMeridiem)

    // For back-date (not today) require Punch-Out fields as well
    let outTime = ''
    if (!isTodaySelected) {
      if (!outHour) {
        setError('Please enter Punch-Out hour for past date')
        return
      }
      if (!outMinute) {
        setError('Please enter Punch-Out minute for past date')
        return
      }
      if (!outMeridiem) {
        setError('Please select Punch-Out AM/PM for past date')
        return
      }
      outTime = buildAmPmTime(outHour, outMinute, outMeridiem)
    }

    try {
      setSubmitting(true)
      await onSubmit({ employeeId, date, inTime, outTime })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40">
      <div className="card-hover bg-white rounded-xl shadow-xl w-[95%] max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 mb-8">
          <h2 className="text-xl font-semibold">Add Attendance (Past Date)</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-700 hover:text-black"
          >
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Employee <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">--- Select Employee ---</option>
              {employees && employees.map((emp) => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name} ({emp.empId})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              max={todayIso}
              onChange={(e) => {
                const newDate = e.target.value
                setDate(newDate)
                // Clear any previously entered Punch-Out when switching to today
                if (newDate === todayIso) {
                  setOutHour('')
                  setOutMinute('00')
                  setOutMeridiem('PM')
                }
              }}
            />
          </div>

          {/* Times Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Punch-In Time <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={inHour}
                  onChange={(e) => setInHour(e.target.value)}
                >
                  <option value="">HH</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-gray-600">:</span>
                <select
                  className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={inMinute}
                  onChange={(e) => setInMinute(e.target.value)}
                >
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={inMeridiem}
                  onChange={(e) => setInMeridiem(e.target.value)}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Punch-Out Time
              </label>
              <div className="flex items-center gap-2">
                <select
                  className={`${isTodaySelected ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''} border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={outHour}
                  onChange={(e) => setOutHour(e.target.value)}
                  disabled={isTodaySelected}
                >
                  <option value="">HH</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-gray-600">:</span>
                <select
                  className={`${isTodaySelected ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''} border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={outMinute}
                  onChange={(e) => setOutMinute(e.target.value)}
                  disabled={isTodaySelected}
                >
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  className={`${isTodaySelected ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''} border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={outMeridiem}
                  onChange={(e) => setOutMeridiem(e.target.value)}
                  disabled={isTodaySelected}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}

          {/* Footer Buttons */}
          <div className="mt-16 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ManualAttendanceModal
