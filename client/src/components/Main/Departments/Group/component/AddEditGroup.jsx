import React, { useState, useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { toast } from "react-toastify";
import axios from "axios";
import { useHierarchy } from "../../../../../context/HierarchyContext";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const API = `${API_URL}/api/department/groups`;

const AddEditGroup = ({
  isOpen,
  onClose,
  isEdit,
  group,
  refreshList,
}) => {
  const { headDepartments } = useHierarchy()

  const [formData, setFormData] = useState({
    groupName: "",
    headDepartment: "",
    section: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= LOAD DATA (EDIT MODE) ================= */
  useEffect(() => {
    if (isEdit && group) {
      setFormData({
        groupName: group.name || "",
        headDepartment: group.headDepartment?._id || group.headDepartment || "",
        section: group.section || "",
      });
    } else {
      setFormData({ groupName: "", headDepartment: "", section: "" });
    }
    setErrors({});
  }, [isOpen, isEdit, group]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const err = {};

    if (!formData.groupName.trim()) {
      err.groupName = "Group name is required";
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

      const payload = { name: formData.groupName }
      if (formData.headDepartment) payload.headDepartment = formData.headDepartment
      else if (formData.section) payload.section = formData.section

      if (isEdit) {
        await axios.put(`${API}/${group._id}`, payload);
        toast.success("Group updated successfully");
      } else {
        await axios.post(API, payload);
        toast.success("Group added successfully");
      }

      refreshList();
      onClose();
    } catch (error) {
      console.error("Error:", error);
      const message = error?.response?.data?.message || error?.message || "Something went wrong";
      toast.error(message);
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
            {isEdit ? "Edit Group" : "Add Group"}
          </h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Group Name 
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 ${
                errors.groupName ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.groupName}
              onChange={(e) =>
                setFormData({ ...formData, groupName: e.target.value })
              }
              placeholder="e.g. Production Group"
            />
            {errors.groupName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.groupName}
              </p>
            )}
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Section
            </label>
            <select
              value={formData.headDepartment}
              onChange={(e) => setFormData({ ...formData, headDepartment: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 ${errors.section ? "border-red-500" : "border-gray-300"}`}
            >
              <option value="">Select Head Department (optional)</option>
              {headDepartments.map(h => (
                <option key={h._id} value={h._id}>{h.name}</option>
              ))}
            </select>
            {errors.section && (
              <p className="text-red-500 text-xs mt-1">{errors.section}</p>
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
              ? "Update Group"
              : "Add Group"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEditGroup;
