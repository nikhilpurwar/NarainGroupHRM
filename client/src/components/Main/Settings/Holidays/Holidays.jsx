import React, { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddFestival from "./components/AddFestival";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const API = `${API_URL}/api/holidays`

const Holidays = () => {
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [festivalList, setFestivalList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all holidays
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setFestivalList(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load holidays. Check server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add Modal
  const handleAddFestival = () => {
    setIsEdit(false);
    setSelectedFestival(null);
    setModal(true);
  };

  // Edit Modal
  const handleEdit = (item) => {
    setSelectedFestival(item);
    setIsEdit(true);
    setModal(true);
  };

  // Delete Festival
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;

    try {
      await axios.delete(`${API_URL}/${id}`);
      toast.success("Festival deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete festival.");
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toISOString().split("T")[0] : "-";

  return (
    <div className="p-6">
      <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-xl rounded-t-xl">
          Festival List

          <button
            onClick={handleAddFestival}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            <p>Add Festival</p>
          </button>
        </div>

        {/* Modal */}
        <AddFestival
          isOpen={modal}
          onClose={() => setModal(false)}
          isEdit={isEdit}
          festival={selectedFestival}
          refreshList={fetchData}
        />

        {/* Loading State */}
        {loading && (
          <p className="text-center py-6 text-gray-600">Loading festivals...</p>
        )}

        {/* Empty State */}
        {!loading && festivalList.length === 0 && (
          <div className="w-sm flex flex-col mx-auto items-center border-dashed border-2 border-gray-300 rounded-lg p-6 my-6 gap-4">
            No Festival Found
            <button
              onClick={handleAddFestival}
              className="flex items-center gap-2 bg-gray-700 text-white rounded-full px-4 py-2 hover:bg-gray-900"
            >
              <IoIosAddCircle size={22} />
              Add Festivals
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && festivalList.length > 0 && (
          <table className="table-auto w-full border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-4 text-left">S.No.</th>
                <th className="px-4 py-4 text-left">Festival Name</th>
                <th className="px-4 py-4 text-left">Festival Date</th>
                <th className="px-4 py-4 text-left">Description</th>
                <th className="px-4 py-4 text-left">Created On</th>
                <th className="px-4 py-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {festivalList.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-t">{index + 1}</td>
                  <td className="px-4 py-3 border-t">{item.name}</td>
                  <td className="px-4 py-3 border-t">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 border-t">
                    {item.description || "-"}
                  </td>
                  <td className="px-4 py-3 border-t">
                    {formatDate(item.createdAt)}
                  </td>

                  <td className="flex items-center gap-3 px-4 py-3 border-t">
                    <FiEdit
                      onClick={() => handleEdit(item)}
                      size={16}
                      className="text-blue-700 cursor-pointer hover:scale-115"
                    />

                    <MdDeleteOutline
                      onClick={() => handleDelete(item._id)}
                      size={20}
                      className="text-red-600 cursor-pointer hover:scale-115"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Holidays;
