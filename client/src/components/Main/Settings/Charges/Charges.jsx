import React, { useEffect, useState, memo } from "react";
import axios from "axios";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddEditCharge from "./components/AddEditCharges";
import ConfirmDelete from "../DeleteConfirmation";
import { useDispatch } from "react-redux";
import { useGlobalLoading } from "../../../../hooks/useGlobalLoading";
import { startLoading, stopLoading } from "../../../../store/loadingSlice";
import SkeletonRows from "../../../SkeletonRows";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const API = `${API_URL}/api/charges`;

const Charges = () => {
  const [charges, setCharges] = useState([]);
  const loading = useGlobalLoading(); // Redux global loading
  const dispatch = useDispatch();

  const storedUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null;
  const role = storedUser?.role;

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ================= FETCH ================= */
  const fetchCharges = async () => {
    try {
      dispatch(startLoading());
      const res = await axios.get(API);
      setCharges(res.data?.data || []);
    } catch {
      toast.error("Failed to load charges");
    } finally {
      dispatch(stopLoading());
    }
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  /* ================= HANDLERS ================= */
  const handleAdd = () => {
    setIsEdit(false);
    setSelectedCharge(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setIsEdit(true);
    setSelectedCharge(item);
    setShowModal(true);
  };

  const handleDelete = (charge) => {
    setDeleteItem(charge);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await axios.delete(`${API}/${deleteItem._id}`);
      toast.success("Charge deleted successfully");
      fetchCharges();
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
    <div className="p-6">
      <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900 text-white text-xl font-semibold">
          Charges List
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            Add Charges
          </button>
        </div>

        {/* Modal */}
        <AddEditCharge
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isEdit={isEdit}
          charge={selectedCharge}
          refreshList={fetchCharges}
        />

        {/* Table */}
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
            {/* Skeleton Loader */}
            {loading && <SkeletonRows rows={5} coln={6} />}

            {/* Empty State */}
            {!loading && charges.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No charges found
                  <button
                    onClick={handleAdd}
                    className="ml-4 flex items-center gap-2 bg-gray-700 text-white rounded-full px-4 py-2 hover:bg-gray-900"
                  >
                    <IoIosAddCircle size={22} />
                    Add Charges
                  </button>
                </td>
              </tr>
            )}

            {/* Data Rows */}
            {!loading &&
              charges.map((c, i) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-t">{i + 1}</td>
                  <td className="px-4 py-3 border-t">{c.deduction}</td>
                  <td className="px-4 py-3 border-t">{c.value_type}</td>
                  <td className="px-4 py-3 border-t">{c.value}</td>
                  <td className="px-4 py-3 border-t">
                    {c.status === 1 ? "Active" : "Inactive"}
                  </td>
                  <td className="flex gap-3 px-4 py-3 border-t">
                    <FiEdit
                      size={16}
                      onClick={() => handleEdit(c)}
                      className="text-blue-600 cursor-pointer"
                    />
                    <MdDeleteOutline
                      size={16}
                      onClick={() => handleDelete(c)}
                      className="text-red-600 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Delete Modal */}
        <ConfirmDelete
          isOpen={showDelete}
          title="Delete Charge"
          message="This charge will be permanently removed."
          itemName={deleteItem?.deduction}
          value={`${deleteItem?.value} (${deleteItem?.value_type})`}
          loading={deleteLoading}
          onCancel={() => setShowDelete(false)}
          onConfirm={confirmDelete}
        />

      </div>
    </div>
  );
};

export default React.memo(Charges);
