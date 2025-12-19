import React from 'react'
import { IoCloseSharp } from 'react-icons/io5'

const PunchRecordsModal = ({ isOpen, onClose, attendance, date, employeeName, shiftHours }) => {
  if (!isOpen || !attendance) return null

  const formatTime = (timeStr) => {
    if (!timeStr) return '--'
    return timeStr
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">{employeeName}</h2>
            <p className="text-sm text-gray-600">Date: {date}</p>
          </div>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Summary Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Shift Hours</p>
            <p className="text-lg font-semibold">{shiftHours}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Worked Hours</p>
            <p className="text-lg font-semibold text-blue-600">{attendance.totalHours || 0}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Regular Hours</p>
            <p className="text-lg font-semibold text-green-600">{attendance.regularHours || 0}h</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Overtime Hours</p>
            <p className="text-lg font-semibold text-orange-600">{attendance.overtimeHours || 0}h</p>
          </div>
        </div>

        {/* Punch Records Table */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-gray-700">Punch Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-3 py-2 text-left">Punch Type</th>
                  <th className="border px-3 py-2 text-left">Time</th>
                  <th className="border px-3 py-2 text-left">Duration from Previous</th>
                </tr>
              </thead>
              <tbody>
                {attendance.punchLogs && attendance.punchLogs.length > 0 ? (
                  attendance.punchLogs.map((log, idx) => {
                    let duration = '--'
                    if (idx > 0 && attendance.punchLogs[idx - 1]) {
                      const prevTime = new Date(attendance.punchLogs[idx - 1].punchTime)
                      const currTime = new Date(log.punchTime)
                      const diffMs = currTime - prevTime
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                      duration = `${diffHours}h ${diffMins}m`
                    }

                    const punchTime = new Date(log.punchTime)
                    const timeStr = punchTime.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border px-3 py-2 font-semibold">
                          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                            log.punchType === 'IN' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {log.punchType}
                          </span>
                        </td>
                        <td className="border px-3 py-2">{timeStr}</td>
                        <td className="border px-3 py-2 text-gray-600">{duration}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="3" className="border px-3 py-2 text-center text-gray-500">
                      No punch records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* In/Out Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">First Punch IN</p>
            <p className="text-lg font-semibold text-green-600">
              {formatTime(attendance.inTime)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Last Punch OUT</p>
            <p className="text-lg font-semibold text-red-600">
              {formatTime(attendance.outTime)}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PunchRecordsModal
