import React, { useState, useEffect, memo } from "react";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";
import { toast } from "react-toastify";
import AddFestival from "./components/AddFestival";
import axios from "axios";
import ConfirmDelete from "../DeleteConfirmation";
import { useDispatch } from "react-redux";
import { useGlobalLoading } from "../../../../hooks/useGlobalLoading";
import { startLoading, stopLoading } from "../../../../store/loadingSlice";
import SkeletonRows from "../../../SkeletonRows";

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
const API = `${API_URL}/api/holidays`

const Holidays = () => {
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [festivalList, setFestivalList] = useState([]);
  // const [loading, setLoading] = useState(false);
    const loading = useGlobalLoading()
  const dispatch = useDispatch()
  const [showDelete, setShowDelete] = useState(false)
const [deleteItem, setDeleteItem] = useState(null)

const handleDelete = (festival) => {
  setDeleteItem(festival)
  setShowDelete(true)
}

const confirmDelete = async () => {
  await axios.delete(`${API}/${deleteItem._id}`)
  toast.success("Festival deleted")
  fetchData()
  setShowDelete(false)
}

  // Fetch all holidays
  const fetchData = async () => {
    try {
      // setLoading(true);
      dispatch(startLoading())
      const res = await axios.get(API);
      setFestivalList(res.data?.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load holidays. Check server!");
    } finally {
      // setLoading(false);
      dispatch(stopLoading())
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

  const formatDate = (date) =>
    date ? new Date(date).toISOString().split("T")[0] : "-";

  const isPastFestival = (festivalDate) => {
  if (!festivalDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const festDate = new Date(festivalDate);
  festDate.setHours(0, 0, 0, 0);

  return festDate < today;
};

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

        {/* Loading State
        {loading && (
          <div className="flex justify-center items-center p-10 gap-4">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="text-center py-6 text-gray-600">Loading festivals...</p>

          </div>
        )} */}

        {/* Empty State
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
        )} */}

        {/* Table */}
        {/* {!loading && festivalList.length > 0 && ( */}
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
            {/* Skeleton */}
            {loading && <SkeletonRows rows={5} coln={7} />}

            {/* Empty */}
            {!loading && festivalList.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No Festival Found
                </td>
              </tr>
            )}

            {/* Data */}
            {!loading &&
              festivalList.map((item, index) => (
                <tr
                  key={item._id}
                  className={`hover:bg-gray-50 ${
                    isPastFestival(item.date)
                      ? "bg-gray-100 text-gray-400"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 border-t">{index + 1}</td>
                  <td className="px-4 py-3 border-t">{item.name}</td>
                  <td className="px-4 py-3 border-t">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-4 py-3 border-t">
                    {item.description || "-"}
                  </td>
                  <td className="px-4 py-3 border-t">
                    {formatDate(item.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                      {!isPastFestival(item.date) ? (
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-full text-blue-700 hover:bg-blue-100"
                        >
                          <FiEdit size={16} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-2 rounded-full text-gray-400 cursor-not-allowed"
                        >
                          <FiEdit size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 rounded-full text-red-600 hover:bg-red-100"
                      >
                        <MdDeleteOutline size={18} />
                      </button>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 border-t">
                    {isPastFestival(item.date) && (
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-300 text-gray-600">
                        Past
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
          </table>
        
        <ConfirmDelete
  isOpen={showDelete}
  title="Delete Festival"
  message="This festival will be removed from the calendar."
  itemName={deleteItem?.name}
  value={`(${formatDate(deleteItem?.date)})`}
  onCancel={() => setShowDelete(false)}
  onConfirm={confirmDelete}
/>
      </div>
    </div>
  );
};
export default React.memo(Holidays);

  {/* Action
  <td className="px-4 py-3 border-t">
    {!isPastFestival(item.date) ? (
      <div className="flex items-center gap-2">
        {/* // Edit   
        <button
          onClick={() => handleEdit(item)}
          title="Edit Festival"
          className="p-2 rounded-full text-blue-700 hover:bg-blue-100 transition"
        >
          <FiEdit size={16} />
        </button>

        {/* // Delete   
        <button
          onClick={() => handleDelete(item)}
          title="Delete Festival"
          className="p-2 rounded-full text-red-600 hover:bg-red-100 transition"
        >
          <MdDeleteOutline size={18} />
        </button>
      </div> 
    ) : (
      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-300 text-gray-600">
        Past
      </span>
    )}
  </td> */}
