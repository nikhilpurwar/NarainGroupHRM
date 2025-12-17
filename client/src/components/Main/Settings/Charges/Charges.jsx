import React, { useEffect, useState } from "react"
import axios from "axios"
import { FiEdit } from "react-icons/fi"
import { MdDeleteOutline } from "react-icons/md"
import { IoIosAddCircle } from "react-icons/io"
import { toast } from "react-toastify"
import AddEditCharge from "./components/AddEditCharges"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
const API = `${API_URL}/api/charges`

const Charges = () => {
  const [charges, setCharges] = useState([])
  const [loading, setLoading] = useState(false)
  const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null
  const role = storedUser?.role
  const [showModal, setShowModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [selectedCharge, setSelectedCharge] = useState(null)

  /* ================= FETCH ================= */
  const fetchCharges = async () => {
    try {
      setLoading(true)
      const res = await axios.get(API)
      setCharges(res.data?.data || [])
    } catch {
      toast.error("Failed to load charges")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCharges()
  }, [])

  /* ================= HANDLERS ================= */
  const handleAdd = () => {
    setIsEdit(false)
    setSelectedCharge(null)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setIsEdit(true)
    setSelectedCharge(item)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return
    try {
      await axios.delete(`${API}/${id}`)
      toast.success("Charge deleted successfully")
      fetchCharges()
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
          Charges List
          {role === 'admin' && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 hover:bg-gray-200"
            >
              <IoIosAddCircle size={22} />
              Add Charges
            </button>
          )}
        </div>

        {/* Modal */}
        <AddEditCharge
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isEdit={isEdit}
          charge={selectedCharge}
          refreshList={fetchCharges}
        />

        {/* Loader */}
        {loading && (
          <div className="flex justify-center items-center p-10">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && charges.length === 0 && (
          <div className="w-sm flex flex-col items-center gap-4 py-6 text-gray-500 border-dashed border-2 border-gray-300 rounded-lg my-6 mx-auto">
            No charges found
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-gray-700 text-white rounded-full px-4 py-2 hover:bg-gray-900"
            >
              <IoIosAddCircle size={22} />
              Add Charges
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && charges.length > 0 && (
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Deduction / Charges</th>
                <th className="px-4 py-2 text-left">Value Type</th>
                <th className="px-4 py-2 text-left">Value</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {charges.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-t">{i + 1}</td>
                  <td className="px-4 py-3 border-t">{c.deduction}</td>
                  <td className="px-4 py-3 border-t">{c.value_type}</td>
                  <td className="px-4 py-3 border-t">{c.value}</td>
                  <td className="px-4 py-3 border-t">
                    {c.status === 1 ? "Active" : "Inactive"}
                  </td>
                  <td className="flex gap-3 px-4 py-3 border-t">
                    {role === 'admin' ? (
                      <>
                        <FiEdit
                          size={16}
                          onClick={() => handleEdit(c)}
                          className="text-blue-600 cursor-pointer"
                        />
                        <MdDeleteOutline
                          size={16}
                          onClick={() => handleDelete(c.id)}
                          className="text-red-600 cursor-pointer"
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

export default Charges