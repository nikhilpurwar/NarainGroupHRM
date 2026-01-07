import React, { useEffect, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/charges`;

const AddEditCharges = ({
  isOpen,
  onClose,
  isEdit,
  charge,
  refreshList,
}) => {
  const [formData, setFormData] = useState({
    deduction: "",
    value_type: "INR",
    value: "",
    status: "1",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= LOAD DATA (EDIT MODE) ================= */
  useEffect(() => {
    if (isEdit && charge) {
      setFormData({
        deduction: charge.deduction || "",
        value_type: charge.value_type || "INR",
        value: charge.value || "",
        status: String(charge.status ?? "1"),
      });
    } else {
      setFormData({
        deduction: "",
        value_type: "INR",
        value: "",
        status: "1",
      });
    }
    setErrors({});
  }, [isOpen, isEdit, charge]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const err = {};
    if (!formData.deduction.trim()) err.deduction = "Charge name is required";
    if (!formData.value) err.value = "Value is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      if (isEdit) {
        await axios.put(`${API}/${charge._id}`, formData);
        toast.success("Charge updated successfully!");
      } else {
        await axios.post(API, formData);
        toast.success("Charge added successfully!");
      }

      refreshList();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card-hover bg-white rounded-xl shadow-xl w-[90%] max-w-md p-4 relative">

        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Charges" : "Add Charges"}
          </h2>
          <button onClick={onClose} className="text-gray-700">
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">

          {/* Deduction */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Deduction / Charges *
            </label>
            <input
              type="text"
              value={formData.deduction}
              onChange={(e) =>
                setFormData({ ...formData, deduction: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded ${
                errors.deduction ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g. PF, TDS, Insurance"
            />
            {errors.deduction && (
              <p className="text-red-500 text-xs">{errors.deduction}</p>
            )}
          </div>

          {/* Value Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Value Type *
            </label>
            <select
              value={formData.value_type}
              onChange={(e) =>
                setFormData({ ...formData, value_type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="INR">INR</option>
              <option value="Percentage">Percentage</option>
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Value *
            </label>
            <input
              type="number"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded ${
                errors.value ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.value && (
              <p className="text-red-500 text-xs">{errors.value}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>

          {/* ACTIONS */}
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEdit
              ? "Update Charges"
              : "Add Charges"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEditCharges;
