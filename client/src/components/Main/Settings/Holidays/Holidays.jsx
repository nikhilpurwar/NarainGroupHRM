import React, { useState, useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddFestival from "./components/AddFestival";
import axios from "axios";

const API_URL = "http://localhost:3001/api/holidays";

const Holidays = () => {
  const [model, setModel] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [festivalList, setFestivalList] = useState([]);

  // Fetch all holidays
  const fetchData = async () => {
    try {
      const res = await axios.get(API_URL);
      setFestivalList(res.data.data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load holidays. Is the server running?");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Add Modal
  const handleAddFestival = () => {
    setIsEdit(false);
    setSelectedFestival(null);
    setModel(true);
  };

  // Open Edit Modal
  const handleEdit = (item) => {
    setSelectedFestival(item);
    setIsEdit(true);
    setModel(true);
  };

  // DELETE festival
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

  return (
    <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-lg rounded-t-xl">
        Festival List
        <button
          onClick={handleAddFestival}
          className="flex items-center justify-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 cursor-pointer"
        >
          <IoIosAddCircle size={22} />
          <p>Add Festival</p>
        </button>
      </div>

      {/* Modal */}
      <AddFestival
        isOpen={model}
        onClose={() => setModel(false)}
        isEdit={isEdit}
        festival={selectedFestival}
        refreshList={fetchData}
      />

      {/* Table */}
      <table className="table-auto w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">S.No.</th>
            <th className="px-4 py-2 text-left">Festival Name</th>
            <th className="px-4 py-2 text-left">Festival Date</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-left">Created On</th>
            <th className="px-4 py-2 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {festivalList.map((item, index) => (
            <tr key={item._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 border-t">{index + 1}</td>
              <td className="px-4 py-3 border-t">{item.name}</td>

              <td className="px-4 py-3 border-t">
                {item.date?.split("T")[0]}
              </td>

              <td className="px-4 py-3 border-t">
                {item.description || "-"}
              </td>

              <td className="px-4 py-3 border-t">
                {item.createdAt?.split("T")[0]}
              </td>

              <td className="flex items-center gap-3 px-4 py-3 border-t">
                <FiEdit
                  onClick={() => handleEdit(item)}
                  size={16}
                  className="text-blue-700 cursor-pointer"
                />

                <MdDeleteOutline
                  onClick={() => handleDelete(item._id)}
                  size={20}
                  className="text-red-600 cursor-pointer"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
};

export default Holidays;
