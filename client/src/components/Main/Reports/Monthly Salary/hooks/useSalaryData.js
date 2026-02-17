import { useState, useCallback, useEffect } from 'react';
import { checkMonthlyExists, fetchMonthlySalary } from '../../../../../services/ApiService';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export const useSalaryData = (filters, currentPage, pageSize) => {
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  // tri-state: null = unknown/checking, true = exists, false = does not exist
  const [dataExists, setDataExists] = useState(null);
  const [checkedMonth, setCheckedMonth] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState(null);

  // Check if salary data exists for the selected month
  const checkDataExists = useCallback(async () => {
    // mark as checking
    setDataExists(null);
    try {
      const params = { month: filters.month, year: filters.year };
      const monthKey = `${filters.year}-${filters.month}`;
      const checkResponse = await checkMonthlyExists(params);

      if (checkResponse.data?.success) {
        const exists = checkResponse.data.data?.exists || false;
        setDataExists(exists);
        setCheckedMonth(monthKey);
        return exists;
      }
      
      setDataExists(false);
      setCheckedMonth(monthKey);
      return false;
    } catch (error) {
      console.error('Error checking salary data:', error);
      setDataExists(false);
      const monthKey = `${filters.year}-${filters.month}`;
      setCheckedMonth(monthKey);
      return false;
    }
  }, [filters.month, filters.year]);

  // Fetch salary data
  const fetchSalaryData = useCallback(async () => {
    // Only fetch when we are sure data exists
    if (dataExists !== true) {
      setSalaryData([]);
      setTotalRecords(0);
      setSummary(null);
      return;
    }

    setLoading(true);
    try {
      const params = {
        employeeName: filters.employeeName,
        month: filters.month,
        year: filters.year,
        subDepartment: filters.subDepartment,
        page: currentPage,
        pageSize
      };

      const response = await fetchMonthlySalary(params);

      if (response.data?.success) {
        const data = response.data.data || {};
        const items = data.items || [];
        const backendSummary = data.summary || null;

        // Map backend items to UI expected shape
        const mapped = items.map(it => {
          const salary = it.salary || it.monthlySalary || 0;
          const empType = it.empType || '';

          // Trust backend-calculated rates (already based on days in month & shiftHours)
          const salaryPerDay = (it.salaryPerDay !== undefined && it.salaryPerDay !== null)
            ? it.salaryPerDay
            : 0;

          const salaryPerHour = (it.salaryPerHour !== undefined && it.salaryPerHour !== null)
            ? it.salaryPerHour
            : (it.salaryPerHr || 0);

          const presentDays = (it.present !== undefined) ? it.present : (it.presentDays !== undefined ? it.presentDays : 0);
          const basicHours = it.workingHrs || it.basicHours || 0;
          const otHours = it.overtimeHrs || it.otHours || 0;
          const basicPay = (it.basicPay !== undefined) ? it.basicPay : (basicHours ? Number((basicHours * (it.salaryPerHr || salaryPerHour || 0)).toFixed(2)) : 0);
          const otPay = it.overtimePayable || it.otPay || 0;
          const totalHours = Number((basicHours + otHours).toFixed(2));
          const totalPay = (it.payableAmount || it.totalPay || 0);

          const sundayAutoPayDays = it.sundayAutopayDays || 0;
          const festivalAutoPayDays = it.festivalAutopayDays || 0;
          const autoPayAmount = (it.sundayAutopayPay || 0) + (it.festivalAutopayPay || 0) || it.autoPayAmount || 0;
          const autoPayDays = (it.autoPayDays !== undefined && it.autoPayDays !== null)
            ? it.autoPayDays
            : (sundayAutoPayDays + festivalAutoPayDays);

          const shiftHours = (it.shiftHours !== undefined && it.shiftHours !== null)
            ? it.shiftHours
            : 8;

          return {
            id: it.id || it._id || it.empId,
            empId: it.empId || '',
            empName: it.empName || '',
            avatar: it.avatar || it.avtar || '',
            empType,
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
            // OT detail buckets from backend (for D/N/S/F view)
            dayOtHours: it.dayOtHours || 0,
            nightOtHours: it.nightOtHours || 0,
            sundayOtHours: it.sundayOtHours || 0,
            festivalOtHours: it.festivalOtHours || 0,
            // OT allowance flags from SalaryRule (used to show crossed-out OT)
            allowDayOT: it.allowDayOT,
            allowNightOT: it.allowNightOT,
            allowSundayOT: it.allowSundayOT,
            allowFestivalOT: it.allowFestivalOT,
            totalHours,
            totalPay,
            autoPayAmount,
            autoPayDays,
            sundayAutoPayDays,
            festivalAutoPayDays,
            shiftHours,
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
            status: it.status || 'Computed',
            note: it.note || ''
          };
        });

        setSalaryData(mapped);
        setTotalRecords(data.totalRecords || 0);
        setSummary(backendSummary);
      } else {
        toast.error(response.data?.message || 'Failed to fetch salary data');
        setSalaryData([]);
        setTotalRecords(0);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      toast.error('Failed to load salary report');
      setSalaryData([]);
      setTotalRecords(0);
      setSummary(null);
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
    summary,
    checkDataExists,
    fetchSalaryData
  };
};
