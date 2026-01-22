import React, { useState, useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { toast } from "react-toastify";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/holidays`

const AddFestival = ({ isOpen, onClose, isEdit, festival, refreshList }) => {
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Load data in edit mode
  useEffect(() => {
    if (isEdit && festival) {
      setFormData({
        name: festival.name || "",
        date: festival.date?.split("T")[0] || "", // Format date for input
        description: festival.description || "",
      });
    } else {
      setFormData({ name: "", date: "", description: "" });
    }
    setErrors({});
  }, [isOpen, isEdit, festival]);

  // Validation
  const validate = () => {
    const err = {};
    if (!formData.name.trim()) err.name = "Festival name is required";
    if (!formData.date.trim()) err.date = "Festival date is required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // Submit Handler (API)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      if (isEdit) {
        // ---------- UPDATE HOLIDAY ----------
        await axios.put(`${API}/${festival._id}`, formData);
      } else {
        // ---------- ADD NEW HOLIDAY ----------
        await axios.post(API, formData);
      }

      refreshList();
      onClose();
      toast.success(isEdit ? "Festival updated successfully!" : "Festival added successfully!");

    } catch (error) {
      console.error("Error saving festival:", error);
      toast.error("Something went wrong. Check console.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card-hover bg-white rounded-xl shadow-xl w-[90%] max-w-md p-4 relative">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Festival" : "Add Festival"}
          </h2>
          <button onClick={onClose} className="text-gray-700">
            <IoCloseSharp size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Festival Name  <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`w-full px-3 py-2 border rounded ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Diwali, Holi"
              
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Festival Date  <span className="text-red-500">*</span></label>
            <input
              type="date"
              className={`w-full px-3 py-2 border rounded ${
                errors.date ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              
            />
            {errors.date && (
              <p className="text-red-500 text-xs">{errors.date}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded resize-none h-24"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional festival details..."
            ></textarea>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEdit
              ? "Update Festival"
              : "Add Festival"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default AddFestival;
