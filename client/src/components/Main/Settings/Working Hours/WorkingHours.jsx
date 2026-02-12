import React, { useEffect, useState } from "react"
import axios from "axios"
import { FiEdit } from "react-icons/fi"
import { MdDeleteOutline } from "react-icons/md"
import { IoIosAddCircle } from "react-icons/io"
import { toast } from "react-toastify"
import AddEditTimings from "./components/AddEditTimings"
import ConfirmDelete from "../DeleteConfirmation"
import { useGlobalLoading } from "../../../../hooks/useGlobalLoading"
import { useDispatch } from "react-redux"
import { startLoading, stopLoading } from "../../../../store/loadingSlice"

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/break-times`

const WorkingHours = () => {
  const [list, setList] = useState([])
  // const [loading, setLoading] = useState(false)
  const loading = useGlobalLoading()
  const dispatch = useDispatch()
  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null
  const role = storedUser?.role
  const [showModal, setShowModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [selectedTiming, setSelectedTiming] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
const [deleteItem, setDeleteItem] = useState(null)
const [deleteLoading, setDeleteLoading] = useState(false)

const handleDelete = (row) => {
  setDeleteItem(row)
  setShowDelete(true)
}

const confirmDelete = async () => {
  if (!deleteItem?._id) {
    toast.error("Invalid record")
    return
  }
  try {
    setDeleteLoading(true)
    await axios.delete(`${API}/${deleteItem._id}`)
    toast.success("Break time deleted successfully")
    fetchData()
  } catch {
    toast.error("Delete failed")
  } finally {
    setDeleteLoading(false)
    setShowDelete(false)
    setDeleteItem(null)
  }
}

  /* ================= FETCH ================= */
  const fetchData = async () => {
    try {
      // setLoading(true)
      dispatch(startLoading())
      const res = await axios.get(API)
      setList(res.data?.data || [])
    } catch {
      toast.error("Failed to load timings")
    } finally {
      // setLoading(false)
      dispatch(stopLoading())
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

  /* ================= UI ================= */
  return (
    <div className="p-6">
      <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900 text-white text-xl font-semibold">
          Break Time          
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full hover:bg-gray-200"
            >
              <IoIosAddCircle size={22} />
              Add Break
            </button>          
        </div>

        {/* Modal */}        
          <AddEditTimings
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            isEdit={isEdit}
            timing={selectedTiming}
            refreshList={fetchData}
          />

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
                <th className="px-4 py-3">Shift Name</th>
                <th className="px-4 py-3">Shift Hour</th>
                <th className="px-4 py-3">Working Start</th>
                <th className="px-4 py-3">Working End</th>
                <th className="px-4 py-3">Break Start</th>
                <th className="px-4 py-3">Break End</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {list.map((item, i) => (
                <tr
                  key={item._id}
                  className="border-t hover:bg-gray-50 text-center"
                >
                  <td className="px-4 py-3">{i + 1}</td>
                  <td>{item.shiftName}</td>
                  <td>{item.shiftHour}</td>
                  <td>{item.shiftStart}</td>
                  <td>{item.shiftEnd}</td>
                  <td>{item.breakInTime}</td>
                  <td>{item.breakOutTime}</td>
                  <td className="flex justify-center gap-3 py-3">                   
                        <FiEdit
                          size={16}
                          onClick={() => handleEdit(item)}
                          className="text-blue-700 cursor-pointer hover:scale-110"
                        />
                        <MdDeleteOutline
                          size={16}
                          onClick={() => handleDelete(item)}
                          className="text-red-600 cursor-pointer hover:scale-110"
                        />                     
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
<ConfirmDelete
  isOpen={showDelete}
  title="Delete Break Time"
  message="This break time record will be permanently deleted."
  itemName={
    deleteItem
      ? `${deleteItem.shiftName} (${deleteItem.shiftStart} - ${deleteItem.shiftEnd})`
      : ""
  }
  value={deleteItem?.shiftHour}
  loading={deleteLoading}
  onCancel={() => setShowDelete(false)}
  onConfirm={confirmDelete}
/>
      </div>
    </div>
  )
}

export default WorkingHours
