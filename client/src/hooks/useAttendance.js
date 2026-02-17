import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { setAttendance } from '../store/attendanceSlice'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

export default function useAttendance(options = {}) {
  const dispatch = useDispatch()

  const fetchToday = async () => {
    const res = await axios.get(`${API_URL}/api/attendance-report/today`)
    return res.data?.data ?? res.data
  }

  const query = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: fetchToday,
    staleTime: 15 * 1000,
    cacheTime: 60 * 1000,
    onSuccess: (data) => {
      try { dispatch(setAttendance(data)) } catch (e) { void e }
    },
    refetchOnWindowFocus: false,
    ...options,
  })

  return query
}
