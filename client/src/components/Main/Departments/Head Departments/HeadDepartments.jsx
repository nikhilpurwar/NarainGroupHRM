import React, { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddHeadDepartment from "./components/AddHeadDepartment";
import axios from "axios";
import DeleteConfirmationModal from "../DeleteConfirmation";

import SkeletonRows from "../../../SkeletonRows";
import { useGlobalLoading } from "../../../../hooks/useGlobalLoading";
import { startLoading, stopLoading } from "../../../../store/loadingSlice";
import { useDispatch } from "react-redux";


const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/department/head-departments`;

const HeadDepartments = () => {
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentList, setDepartmentList] = useState([]);
  // const [loading, setLoading] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const loading = useGlobalLoading();
  const dispatch = useDispatch();

  const handleDelete = (id) => {
  setDeleteId(id);
};

  const confirmDelete = async () => {
  try {
    setDeleting(true);
    await axios.delete(`${API}/${deleteId._id}`);
    toast.success("Head-department deleted successfully!");
    fetchData();
  } catch (err) {
    toast.error("Failed to delete Head-department");
  } finally {
    setDeleting(false);
    setDeleteId(null);
  }
};

  // Fetch head departments
  const fetchData = async () => {
    try {
      // setLoading(true);
      dispatch(startLoading());
      const res = await axios.get(API);
      setDepartmentList(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load head departments. Check server!");
    } finally {
      // setLoading(false);
      dispatch(stopLoading());
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add Modal
  const handleAddDepartment = () => {
    setIsEdit(false);
    setSelectedDepartment(null);
    setModal(true);
  };

  // Edit Modal
  const handleEdit = (item) => {
    setSelectedDepartment(item);
    setIsEdit(true);
    setModal(true);
  };

  // Delete Festival


  // const formatDate = (date) =>
  //   date ? new Date(date).toISOString().split("T")[0] : "-";

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto border border-gray-300 rounded-xl shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-lg rounded-t-xl">
          Head Departments

          <button
            onClick={handleAddDepartment}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            <p>Add Head Department</p>
          </button>
        </div>

        {/* Modal */}
        <AddHeadDepartment
          isOpen={modal}
          onClose={() => setModal(false)}
          isEdit={isEdit}
          department={selectedDepartment}
          refreshList={fetchData}
        />

        {/* Loading State */}
        {/* {loading && (
          <p className="text-center py-6 text-gray-600">Loading head departments...</p>
        )} */}

        {/* Empty State */}
        {/* {!loading && departmentList.length === 0 && (
          <p className="text-center py-6 text-gray-500">
            No head departments found. Click <strong>Add Head Department</strong>.
          </p>
        )} */}

        {/* Table */}
       <table className="table-auto w-full border-collapse">
  <thead className="bg-gray-100 text-gray-700">
    <tr>
      <th className="px-4 py-2 text-left">S.No.</th>
      <th className="px-4 py-2 text-left">Head Department</th>
      <th className="px-4 py-2 text-left">Action</th>
    </tr>
  </thead>
  <tbody>
    {loading ? (
      <SkeletonRows rows={5} coln={3} />
    ) : departmentList.length === 0 ? (
      <tr>
        <td colSpan={3} className="text-center py-6 text-gray-500">
          No head departments found. Click <strong>Add Head Department</strong>.
        </td>
      </tr>
    ) : (
      departmentList.map((item, index) => (
        <tr key={item._id} className="hover:bg-gray-50">
          <td className="px-4 py-3 border-t">{index + 1}</td>
          <td className="px-4 py-3 border-t">{item.name}</td>
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
      ))
    )}
  </tbody>
</table>


        <DeleteConfirmationModal
  open={!!deleteId}
  title="Delete Head Department"
  message="This action cannot be undone."
  itemName={deleteId?.name}
  loading={deleting}
  onCancel={() => setDeleteId(null)}
  onConfirm={confirmDelete}
/>
      </div>
    </div>
  );
};

export default HeadDepartments;
