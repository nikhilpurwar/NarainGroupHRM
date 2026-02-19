import React, { useState, useEffect, useRef } from 'react'
import { IoChevronDown, IoCloseSharp } from 'react-icons/io5'
import { Loader } from 'lucide-react'
import { toast } from 'react-toastify'

const ManualAttendanceModal = ({ isOpen, onClose, employees, employeesLoading, onSubmit }) => {
  const todayIso = new Date().toLocaleDateString('en-CA')

  const [employeeId, setEmployeeId] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [search, setSearch] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const searchWrapRef = useRef(null)

  const [date, setDate] = useState(todayIso)
  const [inHour, setInHour] = useState('')
  const [inMinute, setInMinute] = useState('00')
  const [inMeridiem, setInMeridiem] = useState('AM')
  const [outHour, setOutHour] = useState('')
  const [outMinute, setOutMinute] = useState('00')
  const [outMeridiem, setOutMeridiem] = useState('PM')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset modal fields on open/close
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
      setSearch('')
      setSelectedEmployee(null)
      setEmployeeId('')
    }
  }, [isOpen, todayIso])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const filteredEmployees = (employees || []).filter(emp =>
  emp.name?.toLowerCase().includes(search.toLowerCase()) ||
  emp.empId?.toLowerCase().includes(search.toLowerCase())
)


  const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')

  // Validation
  if (!employeeId) { setError('Please select an employee'); return }
  if (!date) { setError('Please select a date'); return }
  if (!inHour) { setError('Please enter Punch-In hour'); return }
  if (!inMinute) { setError('Please enter Punch-In minute'); return }
  if (!inMeridiem) { setError('Please select Punch-In AM/PM'); return }

  const inTime = buildAmPmTime(inHour, inMinute, inMeridiem)
  let outTime = ''
  if (!isTodaySelected) {
    if (!outHour || !outMinute || !outMeridiem) { 
      setError('Please complete Punch-Out time for past date'); 
      return 
    }
    outTime = buildAmPmTime(outHour, outMinute, outMeridiem)
  }

  setSubmitting(true)

  try {
    // Submit attendance
    await onSubmit({ employeeId, date, inTime, outTime })

    // Show success toast (you can use any toast library, e.g., react-hot-toast)
    // toast.success("Attendance submitted successfully!")

    // Close modal only after success
   // onClose()

  } catch (err) {
    //setError(err.message || "Failed to submit attendance")

    // Optional: show error toast
    toast.error(err.message || "Failed to submit attendance")
  } finally {
    setSubmitting(false)
  }
}



  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40">
      <div className="card-hover bg-white rounded-xl shadow-xl w-[95%] max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 mb-8">
          <h2 className="text-xl font-semibold">Add Attendance (Past Date)</h2>
          <button type="button" onClick={onClose} className="text-gray-700 hover:text-black">
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Employee Dropdown */}
          <div ref={searchWrapRef} className="relative">
            <label className="block text-sm font-medium mb-1">Select Employee <span className="text-red-500">*</span></label>
            <div
              className="relative"
//              onClick={() => {
//   setSearchFocused(true)
//   setSearch('')
// }}

            >
              <input
                type="text"
                placeholder="Select or Search by name or emp id..."
             value={
  searchFocused
    ? search
    : selectedEmployee
    ? `${selectedEmployee.name} (${selectedEmployee.empId})`
    : ''
}
  onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { setSearchFocused(true); if (!searchFocused) setSearch('') }}
                className="w-full border rounded-lg px-3 py-2 pr-10 text-sm"
              />
              <IoChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-transform duration-200 ${searchFocused ? 'rotate-180' : ''}`}
                size={18}
              />
            </div>

        {searchFocused && (
  <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow max-h-60 overflow-auto">

    {/* Loading */}
    {employeesLoading && (
      <div className="px-3 py-3 text-sm text-gray-400">
        Loading employees...
      </div>
    )}

    {/* Employees list */}
    {!employeesLoading && filteredEmployees.length > 0 && (
      filteredEmployees.map(emp => (
        <div
          key={emp._id}
          onClick={() => {
            setEmployeeId(emp._id)
            setSelectedEmployee(emp)
            setSearchFocused(false)
          }}
          className="px-3 py-3 hover:bg-gray-100 cursor-pointer text-sm"
        >
          <div className="flex gap-5">
            <div className="font-medium">{emp.name}</div>
            <div className="text-xs text-gray-500">{emp.empId}</div>
          </div>
        </div>
      ))
    )}

    {/* Empty only when finished loading */}
    {!employeesLoading && filteredEmployees.length === 0 && (
      <div className="px-3 py-3 text-sm text-gray-400">
        No employee found
      </div>
    )}

  </div>
)}



          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              max={todayIso}
              onChange={(e) => {
                const newDate = e.target.value
                setDate(newDate)
                if (newDate === todayIso) {
                  setOutHour(''); setOutMinute('00'); setOutMeridiem('PM')
                }
              }}
            />
          </div>

          {/* Punch-In / Punch-Out */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Punch-In */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punch-In Time <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <select value={inHour} onChange={(e) => setInHour(e.target.value)} className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">HH</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-gray-600">:</span>
                <select value={inMinute} onChange={(e) => setInMinute(e.target.value)} className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={inMeridiem} onChange={(e) => setInMeridiem(e.target.value)} className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Punch-Out */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punch-Out Time</label>
              <div className="flex items-center gap-2">
                <select value={outHour} onChange={(e) => setOutHour(e.target.value)} disabled={isTodaySelected} className={`${isTodaySelected ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''} border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                  <option value="">HH</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-gray-600">:</span>
                <select value={outMinute} onChange={(e) => setOutMinute(e.target.value)} disabled={isTodaySelected} className={`${isTodaySelected ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''} border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={outMeridiem} onChange={(e) => setOutMeridiem(e.target.value)} disabled={isTodaySelected} className={`${isTodaySelected ? 'bg-gray-100 border-gray-400 cursor-not-allowed' : ''} border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

          {/* Footer */}
          <div className="mt-16 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium">Cancel</button>
          <button
    type="submit" // use "button" to prevent default form submit if inside <form>
    // onClick={handleSubmit} // <-- hook up your submit handler here
    disabled={submitting}
    className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
  >
    {submitting ? (
  <>
    <Loader size={16} className="animate-spin" />
    Submitting...
  </>
) : (
  'Submit'
)}
  </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ManualAttendanceModal
