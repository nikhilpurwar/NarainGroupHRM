import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Eye, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { IoIosAddCircle } from "react-icons/io";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";

import AddEditAdvance from "./components/AddEditAdvance";
import ViewAdvance from "./components/ViewAdvance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5100";

const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const ManageAdvance = () => {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [advanceToDelete, setAdvanceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ================= FETCH ADVANCES ================= */
  const fetchAdvances = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/advance`);
      setAdvances(res.data?.data || []);
    } catch {
      toast.error("Failed to load advances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, []);

  /* ================= DELETE FUNCTIONALITY ================= */
  const onDelete = (advance) => {
    setAdvanceToDelete(advance);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!advanceToDelete) return;

    try {
      setDeleting(true);
      await axios.delete(`${API}/api/advance/${advanceToDelete._id}`);

      toast.success("Advance record deleted successfully");

      setAdvances(prev => prev.filter(a => a._id !== advanceToDelete._id));

      setShowDeleteConfirm(false);
      setAdvanceToDelete(null);

      const remainingOnPage = advances.filter(a => a._id !== advanceToDelete._id).length;
      const itemsBeforePage = (currentPage - 1) * pageSize;

      if (remainingOnPage === 0 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }

    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.message || "Failed to delete advance record");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setAdvanceToDelete(null);
  };

  /* ================= STATUS TOGGLE ================= */
  const onToggleStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/api/advance/${id}/status`, {
        status: status === "active" ? "inactive" : "active",
      });
      toast.success("Status updated");
      fetchAdvances();
    } catch {
      toast.error("Failed to update status");
    }
  };

  /* ================= VIEW / EDIT ================= */
  const onView = (data) => {
    setSelectedAdvance(data);
    setShowView(true);
  };

  const onEdit = (data) => {
    setSelectedAdvance(data);
    setShowAddEdit(true);
  };

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(advances.length / pageSize);
  const indexOfLast = currentPage * pageSize;
  const indexOfFirst = indexOfLast - pageSize;

  const currentData = useMemo(
    () => advances.slice(indexOfFirst, indexOfLast),
    [advances, indexOfFirst, indexOfLast]
  );

  const goPrev = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const goNext = () =>
    setCurrentPage((p) => Math.min(p + 1, totalPages));

  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d)) return "-";

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const StatusToggle3D = ({ isActive, onClick }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        title={isActive ? 'Set Inactive' : 'Set Active'}
        className={`
                relative w-12 h-5 rounded-full
                flex items-center
                transition-all duration-300 ease-out
                focus:outline-none
                ${isActive
            ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(34,197,94,0.45)]'
            : 'bg-gradient-to-r from-red-400 to-red-600 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(239,68,68,0.45)]'}
            `}
      >
        {/* Knob */}
        <span
          className={`
                    absolute top-0.5 left-0.5 w-4 h-4 rounded-full
                    bg-gradient-to-b from-white via-gray-100 to-gray-300
                    shadow-[0_2px_5px_rgba(0,0,0,0.45)]
                    transition-transform duration-300 ease-out
                    ${isActive ? 'translate-x-7' : 'translate-x-0'}
                `}
        />

        {/* ON / OFF */}
        {/* <span
          className="
                    absolute inset-0 flex items-center justify-center
                    text-[10px] font-bold tracking-wide text-white
                    pointer-events-none select-none drop-shadow-sm
                "
        >
          {isActive ? 'ON' : 'OFF'}
        </span> */}
      </button>
    );
  };


  /* ================= DELETE CONFIRMATION MODAL ================= */
  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirm || !advanceToDelete) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Advance Record</h3>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={advanceToDelete.employee?.avatar || DEFAULT_AVATAR}
                className="w-10 h-10 rounded-full border"
                alt="Employee"
              />
              <div>
                <p className="font-semibold">{advanceToDelete.employee?.name}</p>
                <p className="text-sm text-gray-500">{advanceToDelete.employee?.empId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Type:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${advanceToDelete.type === "loan" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                  {advanceToDelete.type}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <span className="ml-2 font-semibold">₹{advanceToDelete.amount}</span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="ml-2">{formatDate(advanceToDelete.date)}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${advanceToDelete.status === "active" ? "bg-green-200 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {advanceToDelete.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancelDelete}
              disabled={deleting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-xl text-xl font-semibold">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white/20 rounded-lg">
            ₹
          </div>
          <span>Manage Advance</span>
        </div>
        <button
          onClick={() => {
            setSelectedAdvance(null);
            setShowAddEdit(true);
          }}
          className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <IoIosAddCircle size={22} />
          Add Advance
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow-md overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center p-10">
          </div>
        ) : (
          <table className="w-full table-auto">
            <thead className="">
              <tr className="bg-gray-200 text-left text-sm font-medium text-gray-700">
                <th className="px-4 py-3 border-b">#</th>
                <th className="px-4 py-3 border-b">Employee</th>
                <th className="px-4 py-3 border-b">Date</th>
                <th className="px-4 py-3 border-b" title="Date Installment Start Deducting">
                  <div className="flex items-center gap-1">
                    Installment Start
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">Type</th>
                <th className="px-4 py-3 border-b" title="Total Amount Loan/Advance">
                  <div className="flex items-center gap-1">
                    Amount
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 border-b" title="Loan/Advance Paid">
                  <div className="flex items-center gap-1">
                    Deduction
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 border-b" title="Loan/Advance Balance">
                  <div className="flex items-center gap-1">
                    Balance
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 border-b" title="Installment Paid || Total">
                  <div className="flex items-center gap-1">
                    Installment
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 border-b">Status</th>
                <th className="px-4 py-3 border-b text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentData.length ? (
                currentData.map((a, i) => (
                  <tr
                    key={a._id}
                    className="border-b hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4 font-bold text-gray-600">
                      {indexOfFirst + i + 1}
                    </td>

                    <td className="p-4">
                      <div className="flex gap-3 items-center">
                        <img
                          src={a.employee?.avatar || DEFAULT_AVATAR}
                          className="w-10 h-10 rounded-full border-2 border-white shadow"
                          alt={a.employee?.name}
                        />
                        <div className="flex flex-col">
                          <p className="font-semibold text-gray-900">
                            {a.employee?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {a.employee?.empId}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-gray-700">{formatDate(a.date)}</td>
                    <td className="p-4 text-gray-700">{formatDate(a.start_from)}</td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${a.type === "loan"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-purple-50 text-purple-700 border border-purple-100"
                          }`}
                      >
                        {a.type}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-gray-900">₹{a.amount}</div>
                    </td>

                    <td className="p-4">
                      <div className="text-green-600 font-medium">₹{a.deduction || 0}</div>
                    </td>

                    <td className="p-4">
                      <div className="text-red-600 font-medium">₹{a.balance || 0}</div>
                    </td>

                    <td className="p-4 text-gray-700">
                      {a.instalment || a.totalInstalment || "-"}
                    </td>

                    <td className="p-4">
                      <StatusToggle3D
                        isActive={a.status === "active"}
                        onClick={(e) => {
                          e.stopPropagation?.();
                          onToggleStatus(a._id, a.status);
                        }}
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => onView(a)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors hover:scale-110 cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={20} />
                        </button>
                        <button
                          onClick={() => onEdit(a)}
                          className="p-1 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors hover:scale-110 cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => onDelete(a)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition-colors hover:scale-110 cursor-pointer"
                          title="Delete"
                        >
                          <MdDeleteOutline size={22} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"></path>
                      </svg>
                      <p className="text-lg font-medium">No advance records found</p>
                      <p className="text-sm">Click "Add Advance" to create a new record</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* PAGINATION */}
        {advances.length > 0 && (
          <div className="sticky left-0 flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-6 py-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{indexOfFirst + 1}</span> to{" "}
              <span className="font-semibold">{Math.min(indexOfLast, advances.length)}</span> of{" "}
              <span className="font-semibold">{advances.length}</span> records
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={goPrev}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-gray-900 text-white rounded-lg">
                  {currentPage}
                </span>
                <span className="text-gray-600">of {totalPages}</span>
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={goNext}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showAddEdit && (
        <AddEditAdvance
          data={selectedAdvance}
          onClose={() => setShowAddEdit(false)}
          onSuccess={fetchAdvances}
        />
      )}

      {showView && (
        <ViewAdvance
          data={selectedAdvance}
          onClose={() => setShowView(false)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal />
    </div>
  );
};

export default ManageAdvance;