import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { IoIosAddCircle } from "react-icons/io";
import EmployeeTable from "../commonComponents/employeeTable"
import { useDispatch, useSelector } from 'react-redux'
import { ensureEmployees, fetchEmployees } from '../../../store/employeesSlice'

const AllEmployees = () => {
  const dispatch = useDispatch()
  const employees = useSelector(s => s.employees.data || [])
  const loading = useSelector(s => s.employees.status === 'loading')
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5100";
  const API_BASE = `${API_URL}/api/employees`;

  useEffect(() => {
    dispatch(ensureEmployees())
  }, [dispatch])

  const handleAddEmployee = () => navigate("/employee/add");

  const handleDelete = async (empId) => {
    const confirm = window.confirm("Delete this employee?");
    if (!confirm) return;
    try {
      await axios.delete(`${API_BASE}/${empId}`);
      // Force refetch immediately so status and list update
      dispatch(fetchEmployees())
      toast.success("Employee deleted");
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Delete failed");
    }
  };

  const handleToggleStatus = async (empId, currentStatus) => {
    const next = currentStatus === "active" ? "inactive" : "active";
    try {
      await axios.put(`${API_BASE}/${empId}`, { status: next });
      // Force refetch so UI updates immediately
      dispatch(fetchEmployees())
      toast.success(`Employee ${next}`);
    } catch (err) {
      console.error("Toggle failed", err);
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center p-4 text-white bg-gray-900 rounded-t-xl font-semibold text-xl">
        Our Employees
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/barcodes")}
            className="bg-gray-700 p-2 text-white rounded-full hover:bg-gray-400 transition cursor-pointer"
            title="Barcodes"
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

      <div className="mb-6">
        <EmployeeTable
          employees={employees}
          rowsPerPage={8}
          loading={loading}
          onEdit={(emp) => navigate(`/employee/${emp._id}/edit`)}
          onDelete={(id) => handleDelete(id)}
          onToggleStatus={(id, status) => handleToggleStatus(id, status)}
          onView={(emp) => navigate(`/profile/${emp._id}`)}
          onNameClick={(emp) => navigate(`/profile/${emp._id}`)}
          filtersOptions={{
            departments: ["OFFICE STAFF", "PLANT"],
            subDepartments: ["GENERAL MANAGER", "OPRATION MANAGER"],
            groups: ["senior-staff", "junior-staff"],
          }}
        />
      </div>
    </div>
  );
};

export default AllEmployees;