import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export const useSalaryData = (filters, currentPage, pageSize) => {
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataExists, setDataExists] = useState(false);
  const [checkedMonth, setCheckedMonth] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);

  // Check if salary data exists for the selected month
  const checkDataExists = useCallback(async () => {
    try {
      const params = { month: filters.month };
      const checkResponse = await axios.get(`${API_URL}/api/salary/monthly/exists`, { params });

      if (checkResponse.data?.success) {
        const exists = checkResponse.data.data?.exists || false;
        setDataExists(exists);
        setCheckedMonth(filters.month);
        return exists;
      }
      
      setDataExists(false);
      setCheckedMonth(filters.month);
      return false;
    } catch (error) {
      console.error('Error checking salary data:', error);
      setDataExists(false);
      setCheckedMonth(filters.month);
      return false;
    }
  }, [filters.month]);

  // Fetch salary data
  const fetchSalaryData = useCallback(async () => {
    if (!dataExists) {
      setSalaryData([]);
      setTotalRecords(0);
      return;
    }

    setLoading(true);
    try {
      const params = {
        employeeName: filters.employeeName,
        month: filters.month,
        page: currentPage,
        pageSize
      };

      const response = await axios.get(`${API_URL}/api/salary/monthly`, { params });

      if (response.data?.success) {
        const data = response.data.data || {};
        const items = data.items || [];

        // Map backend items to UI expected shape
        const mapped = items.map(it => {
          const salary = it.salary || it.monthlySalary || 0;
          const salaryPerDayBackend = (it.salaryPerDay !== undefined && it.salaryPerDay !== null) ? it.salaryPerDay : undefined;
          const salaryPerDay30 = (it.salaryPerDay30 !== undefined) ? it.salaryPerDay30 : undefined;
          const salaryPerDayComputed = Number((salary / 30).toFixed(2));
          const salaryPerDay = salaryPerDayBackend ?? salaryPerDay30 ?? salaryPerDayComputed;

          const salaryPerHourBackend = (it.salaryPerHour !== undefined && it.salaryPerHour !== null) ? it.salaryPerHour : undefined;
          const salaryPerHour30 = (it.salaryPerHourFrom30 !== undefined) ? it.salaryPerHourFrom30 : undefined;
          const shiftHours = it.shiftHours || 8;
          const salaryPerHourComputed = Number((salaryPerDay / shiftHours).toFixed(2));
          const salaryPerHour = salaryPerHourBackend ?? salaryPerHour30 ?? salaryPerHourComputed;

          const presentDays = (it.present !== undefined) ? it.present : (it.presentDays !== undefined ? it.presentDays : 0);
          const basicHours = it.workingHrs || it.basicHours || 0;
          const otHours = it.overtimeHrs || it.otHours || 0;
          const basicPay = (it.basicPay !== undefined) ? it.basicPay : (basicHours ? Number((basicHours * (it.salaryPerHr || salaryPerHour || 0)).toFixed(2)) : 0);
          const otPay = it.overtimePayable || it.otPay || 0;
          const totalHours = Number((basicHours + otHours).toFixed(2));
          const totalPay = (it.payableAmount || it.totalPay || 0);

          return {
            id: it.id || it._id || it.empId,
            empId: it.empId || '',
            empName: it.empName || '',
            headDepartment: it.headDepartment || it.department || '',
            subDepartment: it.subDepartment || it.group || '',
            department: it.department || (typeof it.headDepartment === 'object' ? it.headDepartment?.name : it.headDepartment) || '',
            group: it.group || (typeof it.subDepartment === 'object' ? it.subDepartment?.name : it.subDepartment) || '',
            salary,
            salaryPerDay,
            salaryPerHour,
            presentDays,
            basicHours,
            basicPay,
            otHours,
            otPay,
            totalHours,
            totalPay,
            tds: it.tds || 0,
            pTax: it.pTax || it.ptax || 0,
            lwf: it.lwf || 0,
            esi: it.esi || 0,
            basicPF: it.basicPF || it.pf || 0,
            otPF: it.otPF || 0,
            insurance: it.insurance || 0,
            advance: it.advance || 0,
            loanPending: it.loanPending || 0,
            loanReceived: it.loanReceived || 0,
            loanDeduct: it.loanDeduct || 0,
            totalDeductions: (it.totalDeductions !== undefined) ? it.totalDeductions : 0,
            netPay: (it.netPay !== undefined) ? it.netPay : totalPay,
            status: it.status || 'Calculated'
          };
        });

        setSalaryData(mapped);
        setTotalRecords(data.totalRecords || 0);
      } else {
        toast.error(response.data?.message || 'Failed to fetch salary data');
        setSalaryData([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      toast.error('Failed to load salary report');
      setSalaryData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize, dataExists]);

  return {
    salaryData,
    setSalaryData,
    loading,
    dataExists,
    checkedMonth,
    totalRecords,
    checkDataExists,
    fetchSalaryData
  };
};
