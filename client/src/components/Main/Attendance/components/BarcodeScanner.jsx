import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { MdClose, MdCheckCircle } from 'react-icons/md'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'

const BarcodeScanner = ({ isOpen, onClose, onAttendanceMarked }) => {
  const inputRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [isMarking, setIsMarking] = useState(false)
  const [successData, setSuccessData] = useState(null)

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle barcode input
  const handleBarcodeInput = async (e) => {
    const code = e.target.value.trim()
    
    if (!code) return

    setScanning(true)
    setScannedCode(code)

    try {
      setIsMarking(true)
      
      // Call the attendance API with the barcode code
      const res = await axios.post(
        `${API_URL}/api/store-emp-attend?code=${code}`,
        { date: new Date().toLocaleDateString('en-CA') }
      )

      if (res.data?.success || res.data?.data) {
        const empData = res.data.data
        setSuccessData(empData)
        
        toast.success(`✓ Attendance marked for ${empData?.name || 'Employee'}`)
        
        // Call parent callback
        if (onAttendanceMarked) {
          onAttendanceMarked(empData)
        }

        // Auto-reset after 2 seconds
        setTimeout(() => {
          setScannedCode('')
          setSuccessData(null)
          inputRef.current?.focus()
        }, 2000)
      } else {
        toast.error(res.data?.message || 'Failed to mark attendance')
      }
    } catch (err) {
      console.error('Attendance marking error:', err)
      
      let errorMsg = 'Failed to mark attendance'
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      } else if (err.message) {
        errorMsg = err.message
      }
      
      toast.error(errorMsg)
      
      // Reset on error
      setTimeout(() => {
        setScannedCode('')
        setSuccessData(null)
        inputRef.current?.focus()
      }, 1500)
    } finally {
      setIsMarking(false)
      setScanning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Scan Barcode</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <MdClose size={28} />
          </button>
        </div>

        {/* Success State */}
        {successData && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6 text-center">
            <MdCheckCircle size={48} className="mx-auto text-green-500 mb-2" />
            <p className="text-green-700 font-bold text-lg">{successData.name}</p>
            <p className="text-green-600 text-sm">{successData.empId}</p>
            <p className="text-green-500 text-xs mt-2">
              {successData.punchType === 'IN' ? 'Punch IN' : 'Punch OUT'} ✓
            </p>
            {(successData.totalHoursDisplay || successData.totalHours || successData.attendance?.totalHoursDisplay || successData.attendance?.totalHours) && (
              <p className="text-green-600 text-xs mt-1">Total Hours: {successData.totalHoursDisplay || successData.totalHours || successData.attendance?.totalHoursDisplay || successData.attendance?.totalHours} </p>
            )}
          </div>
        )}

        {/* Input Field */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Place scanner here
          </label>
          <input
            ref={inputRef}
            type="text"
            value={scannedCode}
            onChange={handleBarcodeInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleBarcodeInput(e)
              }
            }}
            disabled={isMarking}
            placeholder="Scan employee barcode..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-center text-lg font-mono disabled:bg-gray-100"
            autoComplete="off"
          />
        </div>

        {/* Status Messages */}
        {isMarking && (
          <div className="text-center text-blue-600 font-medium animate-pulse">
            Processing...
          </div>
        )}

        {scanning && !isMarking && (
          <div className="text-center text-green-600 font-medium">
            ✓ Scanned: {scannedCode}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <p className="font-medium mb-2">Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Hold scanner close to barcode</li>
            <li>Barcode will be read automatically</li>
            <li>Attendance will be marked for today</li>
            <li>Press ESC to close</li>
          </ul>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          className="w-full mt-6 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition"
        >
          Close Scanner
        </button>
      </div>

      {/* ESC Key Handler */}
      {isOpen && (
        <div
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          tabIndex={-1}
        />
      )}
    </div>
  )
}

export default BarcodeScanner
