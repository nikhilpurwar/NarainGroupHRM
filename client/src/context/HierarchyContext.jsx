import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const HierarchyContext = createContext()

export const HierarchyProvider = ({ children }) => {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
  
  const [headDepartments, setHeadDepartments] = useState([])
  const [subDepartments, setSubDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHierarchy()
  }, [])

  const fetchHierarchy = async () => {
    try {
      setLoading(true)
      const [hdRes, sdRes, dRes] = await Promise.all([
        axios.get(`${API_URL}/api/department/head-departments`),
        axios.get(`${API_URL}/api/department/sub-departments`),
        axios.get(`${API_URL}/api/department/designations`),
      ])

      setHeadDepartments(hdRes.data?.data || [])
      setSubDepartments(sdRes.data?.data || [])
      setDesignations(dRes.data?.data || [])
    } catch (err) {
      console.error('Failed to fetch hierarchy:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSubDepartmentsByHead = (headId) => {
    return subDepartments.filter(sd => sd.headDepartment?._id === headId)
  }

  const getDesignationsBySubDepartment = (subDeptId) => {
    return designations.filter(d => d.subDepartment?._id === subDeptId)
  }

  return (
    <HierarchyContext.Provider
      value={{
        headDepartments,
        subDepartments,
        designations,
        loading,
        fetchHierarchy,
        getSubDepartmentsByHead,
        getDesignationsBySubDepartment,
      }}
    >
      {children}
    </HierarchyContext.Provider>
  )
}

export const useHierarchy = () => {
  const context = useContext(HierarchyContext)
  if (!context) {
    throw new Error('useHierarchy must be used within HierarchyProvider')
  }
  return context
}
