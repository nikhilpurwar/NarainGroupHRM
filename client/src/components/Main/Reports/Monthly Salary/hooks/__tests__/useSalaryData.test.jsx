import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import * as ApiService from '../../../../../../services/ApiService';
import { useSalaryData } from '../useSalaryData';

vi.mock('../../../../../../services/ApiService');

describe('useSalaryData hook', () => {
  it('checkDataExists returns exists true and fetchSalaryData maps items', async () => {
    const filters = { month: '02', year: '2026', employeeName: '', subDepartment: '' };

    ApiService.checkMonthlyExists.mockResolvedValue({ data: { success: true, data: { exists: true } } });
    ApiService.fetchMonthlySalary.mockResolvedValue({ data: { success: true, data: { items: [{ empId: 'E1', empName: 'Test', salary: 1000 }], totalRecords: 1 } } });

    const { result } = renderHook(() => useSalaryData(filters, 1, 10));

    // call checkDataExists
    await act(async () => {
      const exists = await result.current.checkDataExists();
      expect(exists).toBe(true);
    });

    // set dataExists and fetch
    await act(async () => {
      // manually set dataExists by calling checkDataExists above; now call fetchSalaryData
      await result.current.fetchSalaryData();
    });

    expect(result.current.salaryData.length).toBe(1);
    expect(result.current.totalRecords).toBe(1);
  });
});
