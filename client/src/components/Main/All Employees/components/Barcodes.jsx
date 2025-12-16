import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { MdKeyboardBackspace } from "react-icons/md";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
const API = `${API_URL}/api/employees`

const Barcodes = () => {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 bg-white">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
      >
        <MdKeyboardBackspace size={26} />
        <span className="text-sm font-medium">Back</span>
      </button>     
       
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {list.map((e) => (
          <div key={e._id} className="p-4 border rounded flex flex-col items-center gap-4">
            <div className="w-sm">
              {e.barcode ? (
                <img src={e.barcode} alt={e.empId} className="w-full h-auto object-contain" />
              ) : (
                <div className="w-full h-12 bg-gray-100 flex items-center justify-center">No barcode</div>
              )}
            </div>
            <div className='flex items-center gap-6'>
              <div className="text-xl font-semibold">{e.name}</div>
              <div className="text-sm text-gray-600">{e.empId}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Barcodes
