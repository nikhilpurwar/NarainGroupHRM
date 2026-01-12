import React, { useEffect, useState } from "react"
import axios from "axios"
import { FiEdit } from "react-icons/fi"
import { IoIosAddCircle } from "react-icons/io"
import { MdDeleteOutline } from "react-icons/md"
import { toast } from "react-toastify"
import AddEditUsers from "./components/AddEditUsers"

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/users`

const badgeStyles = {
  admin: "bg-green-100 text-green-700",
  gate: "bg-yellow-100 text-yellow-700",
  account: "bg-blue-100 text-blue-700",
}

const ManageUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  /* ================= FETCH ================= */
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await axios.get(API)
      setUsers(res.data?.data || [])
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  /* ================= ACTIONS ================= */
  const handleAdd = () => {
    setSelectedUser(null)
    setShowModal(true)
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return
    try {
      await axios.delete(`${API}/${id}`)
      toast.success("User deleted successfully")
      fetchUsers()
    } catch {
      toast.error("Delete failed")
    }
  }

  /* ================= UI ================= */
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900 text-white text-xl font-semibold">
          Users List
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            Add User
          </button>
        </div>

        {/* Loader */}
        {loading && (
          <div className="flex justify-center items-center p-10">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && users.length === 0 && (
          <div className="w-sm flex flex-col items-center gap-4 py-6 text-gray-500 border-dashed border-2 border-gray-300 rounded-lg my-6 mx-auto">
            No users found
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-gray-700 text-white rounded-full px-4 py-2 hover:bg-gray-900"
            >
              <IoIosAddCircle size={22} />
              Add User
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left">S.No</th>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left">Email</th>
                  <th className="p-4 text-left">User Type</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user, index) => (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          badgeStyles[user.role] ||
                          "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 flex gap-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                      >
                        <FiEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id || user.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        <MdDeleteOutline size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AddEditUsers
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isEdit={Boolean(selectedUser)}
        user={selectedUser}
        refreshList={fetchUsers}
      />
    </div>
  )
}

export default ManageUsers
