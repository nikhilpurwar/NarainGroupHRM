import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const HierarchyContext = createContext()

export const HierarchyProvider = ({ children }) => {
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'
  
  const [headDepartments, setHeadDepartments] = useState([])
  const [subDepartments, setSubDepartments] = useState([])
  const [groups, setGroups] = useState([])
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHierarchy()
  }, [])

  const fetchHierarchy = async () => {
    try {
      setLoading(true)
      const [hdRes, sdRes, gRes, dRes] = await Promise.all([
        axios.get(`${API_URL}/api/department/head-departments`),
        axios.get(`${API_URL}/api/department/sub-departments`),
        axios.get(`${API_URL}/api/department/groups`),
        axios.get(`${API_URL}/api/department/designations`),
      ])

      setHeadDepartments(hdRes.data?.data || [])
      setSubDepartments(sdRes.data?.data || [])
      setGroups(gRes.data?.data || [])
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

  const getDesignationsByGroup = (groupId) => {
    return designations.filter(d => d.group?._id === groupId)
  }

  const getGroupsBySection = (section) => {
    return groups.filter(g => g.section === section)
  }

  return (
    <HierarchyContext.Provider
      value={{
        headDepartments,
        subDepartments,
        groups,
        designations,
        loading,
        fetchHierarchy,
        getSubDepartmentsByHead,
        getDesignationsByGroup,
        getGroupsBySection,
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
