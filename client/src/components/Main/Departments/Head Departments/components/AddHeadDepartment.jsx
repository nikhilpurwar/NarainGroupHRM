import React, { useState, useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { toast } from "react-toastify";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${API_URL}/api/settings/head-departments`;

const AddHeadDepartment = ({
  isOpen,
  onClose,
  isEdit,
  department,
  refreshList,
}) => {
  const [formData, setFormData] = useState({
    departmentName: "",
    hod: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= LOAD DATA (EDIT MODE) ================= */
  useEffect(() => {
    if (isEdit && department) {
      setFormData({
        departmentName: department.name || "",
        hod: department.hod || "",
      });
    } else {
      setFormData({ departmentName: "", hod: "" });
    }
    setErrors({});
  }, [isOpen, isEdit, department]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const err = {};

    if (!formData.departmentName.trim()) {
      err.departmentName = "Department name is required";
    }

    if (!formData.hod.trim()) {
      err.hod = "HOD name is required";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const payload = { name: formData.departmentName }
      if (formData.hod) payload.hod = formData.hod

      if (isEdit) {
        await axios.put(`${API}/${department._id}`, payload);
        toast.success("Department updated successfully");
      } else {
        await axios.post(API, payload);
        toast.success("Department added successfully");
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
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-md p-5 relative">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Department" : "Add Department"}
          </h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

          {/* Department Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 ${
                errors.departmentName ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.departmentName}
              onChange={(e) =>
                setFormData({ ...formData, departmentName: e.target.value })
              }
              placeholder="e.g. Human Resources"
            />
            {errors.departmentName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.departmentName}
              </p>
            )}
          </div>

          {/* HOD */}
          <div>
            <label className="block text-sm font-medium mb-1">
              HOD <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 ${
                errors.hod ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.hod}
              onChange={(e) =>
                setFormData({ ...formData, hod: e.target.value })
              }
              placeholder="e.g. Rahul Sharma"
            />
            {errors.hod && (
              <p className="text-red-500 text-xs mt-1">{errors.hod}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEdit
              ? "Update Department"
              : "Add Department"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddHeadDepartment;
