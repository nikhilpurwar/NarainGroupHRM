import React, { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { IoIosAddCircle } from "react-icons/io";

const AllEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [nameSearch, setNameSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [subDepartment, setSubDepartment] = useState("");
  const [group, setGroup] = useState("");

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 8;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const API_BASE = `${API_URL}/api/employees`;

  // Fetch API
  useEffect(() => {
    const API = API_BASE;
    axios
      .get(API)
      .then((res) => {
        const list = (res.data && res.data.data) || [];
        setEmployees(list);
        setFiltered(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Employees API Error", err?.message || err);
        toast.error("Failed to load employees");
        setLoading(false);
      });
  }, []);

  // Filtering Logic
  useEffect(() => {
    let temp = [...employees];

    if (nameSearch.trim()) {
      temp = temp.filter((e) =>
        e.name?.toLowerCase().includes(nameSearch.toLowerCase())
      );
    }

    if (department) temp = temp.filter((e) => e.department === department);
    if (subDepartment)
      temp = temp.filter((e) => e.subDepartment === subDepartment);
    if (group) temp = temp.filter((e) => e.group === group);

    setFiltered(temp);
    setCurrentPage(1); // reset pagination
  }, [nameSearch, department, subDepartment, group, employees]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentData = filtered.slice(indexOfFirst, indexOfLast);

  const goNext = () =>
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  const goPrev = () =>
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));

  const navigate = useNavigate();
  const handleAddEmployee = () => navigate("/employee/add");

  const handleDelete = async (empId) => {
    const confirm = window.confirm('Delete this employee?')
    if (!confirm) return
    try {
      await axios.delete(`${API_BASE}/${empId}`)
      setEmployees((prev) => prev.filter((e) => (e._id || e.id) !== empId))
      setFiltered((prev) => prev.filter((e) => (e._id || e.id) !== empId))
      toast.success('Employee deleted')
    } catch (err) {
      console.error('Delete failed', err)
      toast.error('Delete failed')
    }
  }

  const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'

  const handleToggleStatus = async (empId, currentStatus) => {
    const next = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await axios.put(`${API_BASE}/${empId}`, { status: next })
      setEmployees((prev) => prev.map((e) => (e._id === empId ? { ...e, status: next } : e)))
      setFiltered((prev) => prev.map((e) => (e._id === empId ? { ...e, status: next } : e)))
      toast.success(`Employee ${next}`)
    } catch (err) {
      console.error('Toggle failed', err)
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-gray-900 rounded-t-xl font-semibold text-xl">
        Charges List
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/barcodes')}
            className="bg-gray-700 p-2 text-white rounded-full hover:bg-gray-400 transition cursor-pointer"
          >
            <i className="fas fa-barcode"></i>
          </button>

          <button
            title="Add Employee"
            onClick={handleAddEmployee}
            className="flex items-center gap-2 bg-white text-gray-900 rounded-full px-4 py-2 hover:bg-gray-200"
          >
            <IoIosAddCircle size={22} />
            Add Employees
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-b-xl shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by Name"
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
            />
          </div>

          {/* Department Filter */}
          <select
            className="w-full border py-2 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Select Department</option>
            <option value="OFFICE STAFF">Office Staff</option>
            <option value="PLANT">Plant</option>
          </select>

          {/* Sub Department */}
          <select
            className="w-full border py-2 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={subDepartment}
            onChange={(e) => setSubDepartment(e.target.value)}
          >
            <option value="">Select Sub Department</option>
            <option value="GENERAL MANAGER">General Manager</option>
            <option value="OPRATION MANAGER">Operation Manager</option>
          </select>

          {/* Group */}
          <select
            className="w-full border py-2 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">Select Group</option>
            <option value="senior-staff">Senior Staff</option>
            <option value="junior-staff">Junior Staff</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white py-4 rounded-xl shadow-md overflow-x-auto">
        {loading ? (
          <p className="text-center py-6 text-gray-500">Loading employees...</p>
        ) : (
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-100 text-gray-800 text-left">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Father Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Salary</th>
                <th className="px-4 py-3">Emp ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Sub Dept.</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {currentData.length ? (
                currentData.map((emp, i) => (
                  <tr
                    key={emp.id || emp._id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">{indexOfFirst + i + 1}</td>

                    {/* Name + Avatar */}
                    <td className="px-4 py-3 flex items-center gap-3">
                      <img
                        src={emp.avatar || DEFAULT_AVATAR}
                        alt="Profile"
                        className="w-10 h-10 rounded-full border"
                      />
                      <Link
                        to={`/profile/${emp._id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {emp.name}
                      </Link>
                    </td>

                    <td className="px-4 py-3">{emp.fatherName}</td>
                    <td className="px-4 py-3">{emp.mobile}</td>
                    <td className="px-4 py-3">₹{emp.salary}</td>
                    <td className="px-4 py-3">{emp.empId}</td>
                    <td className="px-4 py-3">{emp.headDepartment}</td>
                    <td className="px-4 py-3">{emp.subDepartment}</td>
                    <td className="px-4 py-3">{emp.group}</td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(emp._id, emp.status)}
                        className={`px-3 py-1 rounded-full text-sm ${emp.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        title={`Set ${emp.status === 'active' ? 'inactive' : 'active'}`}>
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="text-center flex justify-center items-center gap-3">
                      <button
                        onClick={() => navigate(`/employee/${emp._id}/edit`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit />
                      </button>

                      <button
                        onClick={() => handleDelete(emp._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <MdDeleteOutline size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-6 text-gray-500">
                    <div className="w-sm flex flex-col mx-auto items-center border-dashed border-2 border-gray-300 rounded-lg p-6 gap-4">
                      No employees found
                      <button
                        onClick={handleAddEmployee}
                        className="flex items-center gap-2 bg-gray-700 text-white rounded-full px-4 py-2 hover:bg-gray-900"
                      >
                        <IoIosAddCircle size={22} />
                        Add Employees
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex justify-center items-center mt-6 gap-4 pb-3">
            <button
              disabled={currentPage === 1}
              onClick={goPrev}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40"
            >
              <ChevronLeft />
            </button>

            <span className="font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={goNext}
              className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40"
            >
              <ChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllEmployees;