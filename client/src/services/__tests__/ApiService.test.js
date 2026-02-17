import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import * as ApiService from '../ApiService';

vi.mock('axios');

describe('ApiService', () => {
  it('payMonthly calls axios.patch with correct url and payload', async () => {
    axios.patch.mockResolvedValue({ data: { success: true, data: { status: 'Paid' } } });
    const res = await ApiService.payMonthly('EMP123', { month: '2026-02', status: 'Paid' });
    expect(axios.patch).toHaveBeenCalled();
    expect(axios.patch.mock.calls[0][0]).toContain('/api/salary/monthly/EMP123/pay');
    expect(res.data.success).toBe(true);
  });

  it('recalculateMonthly calls axios.post with correct url and payload', async () => {
    axios.post.mockResolvedValue({ data: { success: true } });
    const res = await ApiService.recalculateMonthly({ month: '2026-02' });
    expect(axios.post).toHaveBeenCalled();
    expect(axios.post.mock.calls[0][0]).toContain('/api/salary/monthly/calculate');
    expect(res.data.success).toBe(true);
  });

  it('checkMonthlyExists calls axios.get with correct url and params', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: { exists: true } } });
    const res = await ApiService.checkMonthlyExists({ month: '02', year: '2026' });
    expect(axios.get).toHaveBeenCalled();
    expect(axios.get.mock.calls[0][0]).toContain('/api/salary/monthly/exists');
    expect(res.data.data.exists).toBe(true);
  });

  it('fetchMonthlySalary calls axios.get with correct url and params', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: { items: [], totalRecords: 0 } } });
    const res = await ApiService.fetchMonthlySalary({ month: '02', year: '2026' });
    expect(axios.get).toHaveBeenCalled();
    expect(axios.get.mock.calls[0][0]).toContain('/api/salary/monthly');
    expect(res.data.success).toBe(true);
  });
});
