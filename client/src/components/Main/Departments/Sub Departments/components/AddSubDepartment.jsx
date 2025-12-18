import React, { useEffect, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
const DEPT_API = `${API_URL}/api/department/head-departments`;
const SUB_API = `${API_URL}/api/department/sub-departments`;

const AddSubDepartment = ({
  isOpen,
  onClose,
  isEdit,
  subDepartment,
  refreshList,
}) => {
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    headDepartmentId: "",
    subDepartmentName: "",
    hod: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= LOAD HEAD DEPARTMENTS ================= */
  useEffect(() => {
    if (!isOpen) return;

    const fetchDepartments = async () => {
      try {
        const res = await axios.get(DEPT_API);
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load departments");
      }
    };

    fetchDepartments();
  }, [isOpen]);

  /* ================= LOAD EDIT DATA ================= */
  useEffect(() => {
    if (isEdit && subDepartment) {
      setFormData({
        headDepartmentId: subDepartment.headDepartment?._id || subDepartment.headDepartment || "",
        subDepartmentName: subDepartment.name || "",
        hod: subDepartment.hod || "",
      });
    } else {
      setFormData({
        headDepartmentId: "",
        subDepartmentName: "",
        hod: "",
      });
    }
    setErrors({});
  }, [isEdit, subDepartment, isOpen]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const err = {};

    if (!formData.headDepartmentId) {
      err.headDepartmentId = "Head Department is required";
    }

    if (!formData.subDepartmentName.trim()) {
      err.subDepartmentName = "Sub Department name is required";
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

      const payload = { name: formData.subDepartmentName, headDepartment: formData.headDepartmentId }
      if (formData.hod) payload.hod = formData.hod

      if (isEdit) {
        await axios.put(`${SUB_API}/${subDepartment._id}`, payload);
        toast.success("Sub Department updated successfully");
      } else {
        await axios.post(SUB_API, payload);
        toast.success("Sub Department added successfully");
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
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-md p-5">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Sub Department" : "Add Sub Department"}
          </h2>
          <button onClick={onClose}>
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

          {/* Head Department */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Head Department <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 ${
                errors.headDepartmentId ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.headDepartmentId}
              onChange={(e) =>
                setFormData({ ...formData, headDepartmentId: e.target.value })
              }
            >
              <option value="">-- Select Head Department --</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.headDepartmentId && (
              <p className="text-red-500 text-xs mt-1">
                {errors.headDepartmentId}
              </p>
            )}
          </div>

          {/* Sub Department Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Sub Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 ${
                errors.subDepartmentName ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.subDepartmentName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subDepartmentName: e.target.value,
                })
              }
              placeholder="e.g. Accounts, Production"
            />
            {errors.subDepartmentName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.subDepartmentName}
              </p>
            )}
          </div>

          {/* Sub Department Head */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Sub Department Head
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800"
              value={formData.hod}
              onChange={(e) =>
                setFormData({ ...formData, hod: e.target.value })
              }
              placeholder="Optional"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEdit
              ? "Update Sub Department"
              : "Add Sub Department"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddSubDepartment;
