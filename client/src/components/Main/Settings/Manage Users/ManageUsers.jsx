import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiEdit } from "react-icons/fi";
import { IoIosAddCircle } from "react-icons/io";
import { MdDeleteOutline } from "react-icons/md";
import { IoToggle, IoToggleOutline } from "react-icons/io5";
import { toast } from "react-toastify";
import AddEditUsers from "./components/AddEditUsers";
import ConfirmDelete from "../DeleteConfirmation";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const API = `${API_URL}/api/users`;

const badgeStyles = {
  admin: "bg-green-100 text-green-700",
  gate: "bg-yellow-100 text-yellow-700",
  account: "bg-blue-100 text-blue-700",
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [localStatusMap, setLocalStatusMap] = useState({});
  const [pendingToggles, setPendingToggles] = useState({});

  const StatusToggle3D = ({ isActive, onClick, isPending = false }) => {
    return (
    <button
      onClick={onClick}
      type="button"
      disabled={isPending}
      title={isActive ? "Set Inactive" : "Set Active"}
      className={`
        relative w-9 h-5 rounded-full
        flex items-center
        transition-all duration-300 ease-out
        ${isPending ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
        ${
          isActive
            ? "bg-gradient-to-r from-green-400 to-green-600 shadow-[0_3px_8px_rgba(34,197,94,0.45)]"
            : "bg-gradient-to-r from-red-400 to-red-600 shadow-[0_3px_8px_rgba(239,68,68,0.45)]"
        }
      `}
    >
      {/* Knob */}
      <span
        className={`
          absolute top-[4px] left-[4px]
          w-3 h-3 rounded-full
          bg-gradient-to-b from-white via-gray-100 to-gray-300
          shadow-[0_2px_4px_rgba(0,0,0,0.4)]
          transition-transform duration-300
          ${isActive ? "translate-x-4" : "translate-x-0"}
        `}
      />

      {/* Spinner */}
      {isPending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
        </span>
      )}
    </button>
    );
  };
  const toggleStatusOptimistic = async (user) => {
    const id = user._id;
    const prev = user.isActive ? "active" : "inactive";
    const next = prev === "active" ? "inactive" : "active";

    // ✅ Optimistic UI
    setLocalStatusMap((s) => ({ ...s, [id]: next }));
    setPendingToggles((p) => ({ ...p, [id]: true }));

    try {
      await axios.patch(`${API}/${id}/toggle`);

      // ✅ Conditional toast
      if (next === "active") {
        toast.success("User activated successfully");
      } else {
        toast.success("User deactivated successfully");
      }
    } catch (err) {
      console.error(err);
      toast.error("Toggle failed");

      // ❌ Revert on error
      setLocalStatusMap((s) => ({ ...s, [id]: prev }));
    } finally {
      setPendingToggles((p) => {
        const np = { ...p };
        delete np[id];
        return np;
      });

      fetchUsers();
    }
  };

  /* ================= FETCH ================= */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API);
      setUsers(res.data?.data || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ================= ACTIONS ================= */
  const handleAdd = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDelete = (user) => {
    setDeleteItem(user);
    setShowDelete(true);
  };

  // const handleToggleStatus = async (user) => {
  //   try {
  //     const res = await axios.patch(`${API}/${user._id}/toggle`);
  //     toast.success(res.data.message);
  //     fetchUsers();
  //   } catch {
  //     toast.error("Toggle failed");
  //   }
  // };

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await axios.delete(`${API}/${deleteItem._id}`);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteLoading(false);
      setShowDelete(false);
      setDeleteItem(null);
    }
  };

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
                  <th className="p-4 text-left">Status</th>
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
                          badgeStyles[user.role] || "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                
                          {(() => {
                          const id = user._id;
                          const displayed =
                            localStatusMap[id] ??
                            (user.isActive ? "active" : "inactive");
                          const isPending = Boolean(pendingToggles[id]);

                          return (
                            <StatusToggle3D
                              isActive={displayed === "active"}
                              isPending={isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isPending) toggleStatusOptimistic(user);
                              }}
                            />
                          );
                        })()}
                    
                    </td >
                    <td className="p-4 flex items-center gap-2">
                        

                      <button
                        onClick={() => handleEdit(user)}
                        className=" text-blue-600 rounded-lg hover:bg-blue-200"
                        disabled={!user.isActive}
                      >
                        <FiEdit size={19} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className=" text-red-600 rounded-lg hover:bg-red-200"
                      >
                        <MdDeleteOutline size={21} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDelete
        isOpen={showDelete}
        title="Delete User"
        message="This user will be permanently removed."
        itemName={deleteItem?.name}
        value={deleteItem?.role}
        loading={deleteLoading}
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />

      {/* Modal */}
      <AddEditUsers
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isEdit={Boolean(selectedUser)}
        user={selectedUser}
        refreshList={fetchUsers}
      />
    </div>
  );
};

export default ManageUsers;
