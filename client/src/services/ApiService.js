import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export async function payMonthly(empId, payload) {
  return axios.patch(`${API_URL}/api/salary/monthly/${empId}/pay`, payload);
}

export async function recalculateMonthly(payload) {
  return axios.post(`${API_URL}/api/salary/monthly/calculate`, payload);
}

export async function checkMonthlyExists(params) {
  return axios.get(`${API_URL}/api/salary/monthly/exists`, { params });
}

export async function fetchMonthlySalary(params) {
  return axios.get(`${API_URL}/api/salary/monthly`, { params });
}

export default {
  payMonthly,
  recalculateMonthly,
};
