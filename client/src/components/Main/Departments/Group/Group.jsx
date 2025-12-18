
import React, { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddEditGroup from './component/AddEditGroup'
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/department/groups`;

const Groups = () => {
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupList, setGroupList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch groups
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API);
      setGroupList(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load groups. Check server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add Modal
  const handleAddGroup = () => {
    setIsEdit(false);
    setSelectedGroup(null);
    setModal(true);
  };

  // Edit Modal
  const handleEdit = (item) => {
    setSelectedGroup(item);
    setIsEdit(true);
    setModal(true);
  };

  // Delete Group
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      await axios.delete(`${API}/${id}`);
      toast.success("Group deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete group.");
    }
  };

  return (
    <div className="p-6">
      <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-lg rounded-t-xl">
          Groups

          <button
            onClick={handleAddGroup}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            <p>Add Group</p>
          </button>
        </div>

        {/* Modal */}
        <AddEditGroup
          isOpen={modal}
          onClose={() => setModal(false)}
          isEdit={isEdit}
          group={selectedGroup}
          refreshList={fetchData}
        />

        {/* Loading State */}
        {loading && (
          <p className="text-center py-6 text-gray-600">Loading groups...</p>
        )}

        {/* Empty State */}
        {!loading && groupList.length === 0 && (
          <p className="text-center py-6 text-gray-500">
            No groups found. Click <strong>Add Group</strong>.
          </p>
        )}

        {/* Table */}
        {!loading && groupList.length > 0 && (
          <table className="table-auto w-full border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">S.No.</th>
                <th className="px-4 py-2 text-left">Group Name</th>
                <th className="px-4 py-2 text-left">Section</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {groupList.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-t">{index + 1}</td>
                  <td className="px-4 py-3 border-t">{item.name}</td>
                  <td className="px-4 py-3 border-t">{item.headDepartment?.name || item.section || "-"}</td>

                  <td className="flex items-center gap-3 px-4 py-3 border-t">
                    <FiEdit
                      onClick={() => handleEdit(item)}
                      size={16}
                      className="text-blue-700 cursor-pointer hover:scale-105"
                    />

                    <MdDeleteOutline
                      onClick={() => handleDelete(item._id)}
                      size={20}
                      className="text-red-600 cursor-pointer hover:scale-105"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Groups;
