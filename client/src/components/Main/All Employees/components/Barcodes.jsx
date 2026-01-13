import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { MdKeyboardBackspace } from 'react-icons/md'
import { FiDownload, FiSearch, FiPrinter } from 'react-icons/fi'
import '../../../.././print.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/employees`

const Barcodes = () => {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .print-area, .print-area * { visibility: visible; }
        .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        
        .barcode-card::after {
          content: '';
          position: absolute;
          top: -0.5px;
          left: -0.5px;
          right: -0.5px;
          bottom: -0.5px;
          border: 1px dashed #8a8a8aff;
          pointer-events: none;
          z-index: 1;
        }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/barcodes`)
        setList(res.data.data || [])
      } catch (err) {
        console.error('Failed to load barcodes', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  /** 🔍 Filtered List */
  const filteredList = useMemo(() => {
    if (!search) return list
    return list.filter(e =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.empId?.toLowerCase().includes(search.toLowerCase())
    )
  }, [search, list])

  /** ⬇️ Download single barcode */
  const downloadBarcode = (src, name) => {
    const link = document.createElement('a')
    link.href = src
    link.download = `${name || 'barcode'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /** 🖨️ Print / Download all */
  const printAll = () => {
    window.print()
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 bg-transparent max-w-7xl mx-auto space-y-6 print:p-0 print:max-w-none print:space-y-0 barcode-print-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <MdKeyboardBackspace size={26} />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or empId..."
              className="pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-black focus:outline-none w-64"
            />
          </div>

          {/* Print All */}
          <button
            onClick={printAll}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800"
          >
            <FiPrinter />
            Print All
          </button>
        </div>
      </div>

      {/* Barcode Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 print:grid-cols-4 print-area print:gap-0">
        {filteredList.map(e => (
          <div
            key={e._id}
            className="py-4 px-2 flex flex-col items-center gap-3 relative border border-gray-300 print:border-none print:gap-0 print:py-4 print:px-4 barcode-card"
          >
            {e.barcode ? (
              <>
                <img
                  src={e.barcode}
                  alt={e.empId}
                  className="w-full h-20 object-contain"
                />

                {/* Download icon */}
                <button
                  onClick={() => downloadBarcode(e.barcode, e.empId)}
                  className="absolute bottom-3 right-3 p-2 rounded-full bg-white shadow-[0_0_12px_4px_rgba(0,0,0,0.1)] hover:bg-gray-100 print:hidden"
                  title="Download barcode"
                >
                  <FiDownload size={16} />
                </button>
              </>
            ) : (
              <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
                No barcode
              </div>
            )}

            <div className="flex flex-col items-center">
              <div className="text-lg font-semibold print:text-base">{e.name}</div>
              <div className="text-sm text-gray-600 print:text-xs">{e.empId}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Barcodes
