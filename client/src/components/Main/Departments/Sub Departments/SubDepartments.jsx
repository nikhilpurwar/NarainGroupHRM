import React, { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddSubDepartment from "./components/AddSubDepartment";
import axios from "axios";
import DeleteConfirmationModal from "../DeleteConfirmation";

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/department/sub-departments`;

const SubDepartments = () => {
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedSubDept, setSelectedSubDept] = useState(null);
  const [subDeptList, setSubDeptList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (id) => {
  setDeleteId(id);
};

  const confirmDelete = async () => {
  try {
    setDeleting(true);
    await axios.delete(`${API}/${deleteId._id}`);
    toast.success("Sub-department deleted successfully!");
    fetchData();
  } catch (err) {
    toast.error("Failed to delete sub-department");
  } finally {
    setDeleting(false);
    setDeleteId(null);
  }
};

  // Fetch sub-departments
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API);
      setSubDeptList(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load sub-departments. Check server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add Modal
  const handleAddSubDept = () => {
    setIsEdit(false);
    setSelectedSubDept(null);
    setModal(true);
  };

  // Edit Modal
  const handleEdit = (item) => {
    setSelectedSubDept(item);
    setIsEdit(true);
    setModal(true);
  };



  const formatDate = (date) =>
    date ? new Date(date).toISOString().split("T")[0] : "-";

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto border border-gray-300 rounded-xl shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-lg rounded-t-xl">
          Sub Departments

          <button
            onClick={handleAddSubDept}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            <p>Add Sub Department</p>
          </button>
        </div>

        {/* Modal */}
        <AddSubDepartment
          isOpen={modal}
          onClose={() => setModal(false)}
          isEdit={isEdit}
          subDepartment={selectedSubDept}
          refreshList={fetchData}
        />

        {/* Loading State */}
        {loading && (
          <p className="text-center py-6 text-gray-600">Loading sub-departments...</p>
        )}

        {/* Empty State */}
        {!loading && subDeptList.length === 0 && (
          <p className="text-center py-6 text-gray-500">
            No sub-departments found. Click <strong>Add Sub Department</strong>.
          </p>
        )}

        {/* Table */}
        {!loading && subDeptList.length > 0 && (
          <table className="table-auto w-full border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">S.No.</th>
                <th className="px-4 py-2 text-left">Sub Department Name</th>
                <th className="px-4 py-2 text-left">Head Department Name</th>
                {/* <th className="px-4 py-2 text-left">HOD</th> */}
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {subDeptList.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-t">{index + 1}</td>
                  <td className="px-4 py-3 border-t">{item.name}</td>
                  <td className="px-4 py-3 border-t">{item.headDepartment?.name || '-'}</td>
                  {/* <td className="px-4 py-3 border-t">{item.hod}</td> */}

                 <td className="px-4 py-3 border-t">
                           <div className="flex items-center gap-3">
                             <FiEdit
                               onClick={() => handleEdit(item)}
                               size={16}
                               className="text-blue-600 cursor-pointer hover:text-blue-800 transition"
                             />
                 
                             <MdDeleteOutline
                               onClick={() => handleDelete(item)}
                               size={20}
                               className="text-red-600 cursor-pointer hover:text-red-800 transition"
                             />
                           </div>
                         </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
              <DeleteConfirmationModal
  open={!!deleteId}
  title="Delete Sub Department"
  message="This action cannot be undone."
  itemName={deleteId?.name}
  value={deleteId?.headDepartment?.name}
  loading={deleting}
  onCancel={() => setDeleteId(null)}
  onConfirm={confirmDelete}
/>

      </div>
    </div>
  );
};

export default SubDepartments;
