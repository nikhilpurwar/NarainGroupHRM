import React, { useEffect, useState } from "react"
import axios from "axios"
import { FiEdit } from "react-icons/fi"
import { MdDeleteOutline } from "react-icons/md"
import { IoIosAddCircle } from "react-icons/io"
import { toast } from "react-toastify"
import AddEditTimings from "./components/AddEditTimings"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
const API = `${API_URL}/api/break-times`

const WorkingHours = () => {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null
  const role = storedUser?.role
  const [showModal, setShowModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [selectedTiming, setSelectedTiming] = useState(null)

  /* ================= FETCH ================= */
  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await axios.get(API)
      setList(res.data?.data || [])
    } catch {
      toast.error("Failed to load timings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  /* ================= HANDLERS ================= */
  const handleAdd = () => {
    setIsEdit(false)
    setSelectedTiming(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setIsEdit(true)
    setSelectedTiming(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return
    try {
      await axios.delete(`${API}/${id}`)
      toast.success("Deleted successfully")
      fetchData()
    } catch {
      toast.error("Delete failed")
    }
  }

  /* ================= UI ================= */
  return (
    <div className="p-6">
      <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900 text-white text-xl font-semibold">
          Break Time
          {role === 'admin' && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full hover:bg-gray-200"
            >
              <IoIosAddCircle size={22} />
              Add Break
            </button>
          )}
        </div>

        {/* Modal */}
        {role === 'admin' && (
          <AddEditTimings
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            isEdit={isEdit}
            timing={selectedTiming}
            refreshList={fetchData}
          />
        )}

        {/* Loader */}
        {loading && (
          <div className="flex justify-center items-center p-10">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && list.length === 0 && (
          <div className="w-sm flex flex-col items-center gap-4 py-6 text-gray-500 border-dashed border-2 border-gray-300 rounded-lg my-6 mx-auto">
            No break timings found
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-gray-700 text-white rounded-full px-4 py-2 hover:bg-gray-900"
            >
              <IoIosAddCircle size={22} />
              Add Break
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && list.length > 0 && (
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Working Start</th>
                <th className="px-4 py-3">Working End</th>
                <th className="px-4 py-3">Break Start</th>
                <th className="px-4 py-3">Break End</th>
                <th className="px-4 py-3">Night Start</th>
                <th className="px-4 py-3">Night End</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {list.map((item, i) => (
                <tr
                  key={item.id}
                  className="border-t hover:bg-gray-50 text-center"
                >
                  <td className="px-4 py-3">{i + 1}</td>
                  <td>{item.timestart}</td>
                  <td>{item.endtime}</td>
                  <td>{item.inTime}</td>
                  <td>{item.outTime}</td>
                  <td>{item.nightIn}</td>
                  <td>{item.nightOut}</td>
                  <td className="flex justify-center gap-3 py-3">
                    {role === 'admin' ? (
                      <>
                        <FiEdit
                          size={16}
                          onClick={() => handleEdit(item)}
                          className="text-blue-700 cursor-pointer hover:scale-110"
                        />
                        <MdDeleteOutline
                          size={16}
                          onClick={() => handleDelete(item._id || item.id)}
                          className="text-red-600 cursor-pointer hover:scale-110"
                        />
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default WorkingHours
