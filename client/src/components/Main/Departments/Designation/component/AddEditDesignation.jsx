import React, { useState, useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { toast } from "react-toastify";
import axios from "axios";
import { useHierarchy } from "../../../../../context/HierarchyContext";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const API = `${API_URL}/api/department/designations`;

const AddEditDesignation = ({
  isOpen,
  onClose,
  isEdit,
  designation,
  refreshList,
}) => {
  const { subDepartments } = useHierarchy();
  const [formData, setFormData] = useState({
    designationName: "",
    subDepartment: "",
    code: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= LOAD DATA (EDIT MODE) ================= */
  useEffect(() => {
    if (isEdit && designation) {
      setFormData({
        designationName: designation.name || "",
        subDepartment: designation.subDepartment?._id || designation.subDepartment || "",
        code: designation.code || "",
      });
    } else {
      setFormData({ designationName: "", subDepartment: "", code: "" });
    }
    setErrors({});
  }, [isOpen, isEdit, designation]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const err = {};

    if (!formData.designationName.trim()) {
      err.designationName = "Designation name is required";
    }

    if (!formData.subDepartment) {
      err.subDepartment = "Sub Department is required";
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

      const payload = {
        name: formData.designationName,
        subDepartment: formData.subDepartment,
      }
      if (formData.code) payload.code = formData.code

      if (isEdit) {
        await axios.put(`${API}/${designation._id}`, payload);
        toast.success("Designation updated successfully");
      } else {
        await axios.post(API, payload);
        toast.success("Designation added successfully");
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
      <div className="card-hover bg-white rounded-xl shadow-xl w-[90%] max-w-md p-5 relative">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Designation" : "Add Designation"}
          </h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

          {/* Sub Department */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Sub Department
              <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.subDepartment ? "border-red-500" : "border-gray-300"
                }`}
              value={formData.subDepartment}
              onChange={(e) =>
                setFormData({ ...formData, subDepartment: e.target.value })
              }
            >
              <option value="">Select Sub Department</option>
              {subDepartments.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.subDepartment && (
              <p className="text-red-500 text-xs mt-1">{errors.subDepartment}</p>
            )}
          </div>

          {/* Designation Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Designation Name
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.designationName ? "border-red-500" : "border-gray-300"
                }`}
              value={formData.designationName}
              onChange={(e) =>
                setFormData({ ...formData, designationName: e.target.value })
              }
              placeholder="e.g. Senior Manager"
            />
            {errors.designationName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.designationName}
              </p>
            )}
          </div>

          {/* Code */}
          {/* <div>
            <label className="block text-sm font-medium mb-1">
              Code
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 ${
                errors.code ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="e.g. SM001 (Optional)"
            />
            {errors.code && (
              <p className="text-red-500 text-xs mt-1">{errors.code}</p>
            )}
          </div> */}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEdit
                ? "Update Designation"
                : "Add Designation"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEditDesignation;
