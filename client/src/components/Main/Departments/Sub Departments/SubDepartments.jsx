import React, { useState, useEffect, memo } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddSubDepartment from "./components/AddSubDepartment";
import axios from "axios";
import DeleteConfirmationModal from "../DeleteConfirmation";
import SkeletonRows from "../../../../components/SkeletonRows"
import { useGlobalLoading } from "../../../../hooks/useGlobalLoading";
import { startLoading, stopLoading } from "../../../../store/loadingSlice"
import { useDispatch } from "react-redux";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const API = `${API_URL}/api/department/sub-departments`;

const SubDepartments = () => {
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedSubDept, setSelectedSubDept] = useState(null);
  const [subDeptList, setSubDeptList] = useState([]);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const dispatch = useDispatch();
  const loading = useGlobalLoading(); // global loading from redux

  // Fetch sub-departments
  const fetchData = async () => {
    try {
      dispatch(startLoading());
      const res = await axios.get(API);
      setSubDeptList(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load sub-departments. Check server!");
      setSubDeptList([]);
    } finally {
      dispatch(stopLoading());
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add/Edit
  const handleAddSubDept = () => {
    setIsEdit(false);
    setSelectedSubDept(null);
    setModal(true);
  };

  const handleEdit = (item) => {
    setSelectedSubDept(item);
    setIsEdit(true);
    setModal(true);
  };

  // Delete
  const handleDelete = (item) => setDeleteItem(item);

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await axios.delete(`${API}/${deleteItem._id}`);
      toast.success("Sub-department deleted successfully!");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete sub-department");
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  };

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

        {/* Add/Edit Modal */}
        <AddSubDepartment
          isOpen={modal}
          onClose={() => setModal(false)}
          isEdit={isEdit}
          subDepartment={selectedSubDept}
          refreshList={fetchData}
        />

        {/* Table */}
        <table className="table-auto w-full border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">S.No.</th>
              <th className="px-4 py-2 text-left">Sub Department Name</th>
              <th className="px-4 py-2 text-left">Head Department Name</th>
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>

      <tbody>
  {loading ? (
    <SkeletonRows rows={5} coln={4} />
  ) : subDeptList.length === 0 ? (
    <tr>
      <td colSpan={4} className="text-center py-6 text-gray-500">
        No sub-departments found. Click <strong>Add Sub Department</strong>.
      </td>
    </tr>
  ) : (
    subDeptList.map((item, index) => (
      <tr key={item._id} className="hover:bg-gray-50">
        <td className="px-4 py-3 border-t">{index + 1}</td>
        <td className="px-4 py-3 border-t">{item.name}</td>
        <td className="px-4 py-3 border-t">{item.headDepartment?.name || "-"}</td>
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

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          open={!!deleteItem}
          title="Delete Sub Department"
          message="This action cannot be undone."
          itemName={deleteItem?.name}
          value={deleteItem?.headDepartment?.name}
          loading={deleting}
          onCancel={() => setDeleteItem(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
};

export default memo(SubDepartments);
