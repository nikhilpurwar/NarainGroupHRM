import React, { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddEditDesignation from "./component/AddEditDesignation";
import axios from "axios";
import DeleteConfirmationModal from "../DeleteConfirmation";

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/department/designations`;

const Designation = () => {
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [designationList, setDesignationList] = useState([]);
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
    toast.success("Designation deleted successfully!");
    fetchData();
  } catch (err) {
    toast.error("Failed to delete Designation");
  } finally {
    setDeleting(false);
    setDeleteId(null);
  }
};
  // Fetch designations
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API);
      setDesignationList(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load designations. Check server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add Modal
  const handleAddDesignation = () => {
    setIsEdit(false);
    setSelectedDesignation(null);
    setModal(true);
  };

  // Edit Modal
  const handleEdit = (item) => {
    setSelectedDesignation(item);
    setIsEdit(true);
    setModal(true);
  };



  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto border border-gray-300 rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-lg rounded-t-xl">
          Designations

          <button
            onClick={handleAddDesignation}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            <p>Add Designation</p>
          </button>
        </div>

        {/* Modal */}
        <AddEditDesignation
          isOpen={modal}
          onClose={() => setModal(false)}
          isEdit={isEdit}
          designation={selectedDesignation}
          refreshList={fetchData}
        />

        {/* Loading State */}
        {loading && (
          <p className="text-center py-6 text-gray-600">Loading designations...</p>
        )}

        {/* Empty State */}
        {!loading && designationList.length === 0 && (
          <p className="text-center py-6 text-gray-500">
            No designations found. Click <strong>Add Designation</strong>.
          </p>
        )}

        {/* Table */}
        {!loading && designationList.length > 0 && (
          <table className="table-auto w-full border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">S.No.</th>
                <th className="px-4 py-2 text-left">Designation Name</th>
                <th className="px-4 py-2 text-left">Sub Department</th>
                {/* <th className="px-4 py-2 text-left">Code</th> */}
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {designationList.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-t">{index + 1}</td>
                  <td className="px-4 py-3 border-t">{item.name}</td>
                  <td className="px-4 py-3 border-t">{item.subDepartment?.name || "-"}</td>
                  {/* <td className="px-4 py-3 border-t">{item.code || "-"}</td> */}

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
  title="Delete Designation Department"
  message="This action cannot be undone."
  itemName={deleteId?.name}
  value={deleteId?.subDepartment?.name}
  loading={deleting}
  onCancel={() => setDeleteId(null)}
  onConfirm={confirmDelete}
/>
      </div>
    </div >
  );
};

export default Designation;
