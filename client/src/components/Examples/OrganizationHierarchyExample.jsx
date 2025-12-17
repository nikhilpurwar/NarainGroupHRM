import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useHierarchy } from '../../../../context/HierarchyContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

/**
 * Example: Display Organization Hierarchy
 * Shows departments, groups, and designations structure
 */
const OrganizationHierarchyExample = () => {
  const { headDepartments, groups, getSubDepartmentsByHead, getDesignationsByGroup } = useHierarchy()
  const [expandedSections, setExpandedSections] = useState({})

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const plantGroups = groups.filter((g) => g.section === 'PLANT')
  const officeGroups = groups.filter((g) => g.section === 'OFFICE')
  const finishGroups = groups.filter((g) => g.section === 'FINISH')

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">Organization Hierarchy</h1>

      {/* PLANT SECTION */}
      <div className="mb-8 border-l-4 border-blue-600 pl-4">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">🏭 PLANT SECTION (8 Hours Shift)</h2>
        {plantGroups.map((group) => (
          <div key={group._id} className="mb-4 bg-blue-50 p-4 rounded">
            <div
              onClick={() => toggleSection(group._id)}
              className="cursor-pointer font-semibold text-lg text-blue-700 hover:text-blue-900"
            >
              {expandedSections[group._id] ? '▼' : '▶'} {group.name}
            </div>
            {expandedSections[group._id] && (
              <div className="mt-3 pl-4 space-y-2">
                {getDesignationsByGroup(group._id).map((des) => (
                  <div key={des._id} className="text-sm bg-white p-2 rounded border-l-2 border-blue-300">
                    <span className="font-semibold">{des.name}</span>
                    <span className="text-gray-500 text-xs ml-2">({des.code})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* OFFICE SECTION */}
      <div className="mb-8 border-l-4 border-green-600 pl-4">
        <h2 className="text-2xl font-bold text-green-600 mb-4">🏢 OFFICE SECTION (8 Hours Shift)</h2>
        {officeGroups.map((group) => (
          <div key={group._id} className="mb-4 bg-green-50 p-4 rounded">
            <div
              onClick={() => toggleSection(group._id)}
              className="cursor-pointer font-semibold text-lg text-green-700 hover:text-green-900"
            >
              {expandedSections[group._id] ? '▼' : '▶'} {group.name}
            </div>
            {expandedSections[group._id] && (
              <div className="mt-3 pl-4 space-y-2">
                {getDesignationsByGroup(group._id).map((des) => (
                  <div key={des._id} className="text-sm bg-white p-2 rounded border-l-2 border-green-300">
                    <span className="font-semibold">{des.name}</span>
                    <span className="text-gray-500 text-xs ml-2">({des.code})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FINISH SECTION */}
      <div className="mb-8 border-l-4 border-orange-600 pl-4">
        <h2 className="text-2xl font-bold text-orange-600 mb-4">⚙️ FINISH SECTION (10 Hours + OT)</h2>
        {finishGroups.map((group) => (
          <div key={group._id} className="mb-4 bg-orange-50 p-4 rounded">
            <div
              onClick={() => toggleSection(group._id)}
              className="cursor-pointer font-semibold text-lg text-orange-700 hover:text-orange-900"
            >
              {expandedSections[group._id] ? '▼' : '▶'} {group.name}
            </div>
            {expandedSections[group._id] && (
              <div className="mt-3 pl-4 space-y-2">
                {getDesignationsByGroup(group._id).map((des) => (
                  <div key={des._id} className="text-sm bg-white p-2 rounded border-l-2 border-orange-300">
                    <span className="font-semibold">{des.name}</span>
                    <span className="text-gray-500 text-xs ml-2">({des.code})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* DEPARTMENTS */}
      <div className="mt-10 border-t-2 pt-6">
        <h2 className="text-2xl font-bold mb-4">📋 Departments</h2>
        {headDepartments.map((hd) => (
          <div key={hd._id} className="mb-6 p-4 bg-gray-50 rounded">
            <div
              onClick={() => toggleSection(`dept-${hd._id}`)}
              className="cursor-pointer font-bold text-lg text-gray-800 hover:text-gray-600"
            >
              {expandedSections[`dept-${hd._id}`] ? '▼' : '▶'} {hd.name}
            </div>
            <p className="text-sm text-gray-600 mt-1">{hd.description}</p>
            {expandedSections[`dept-${hd._id}`] && (
              <div className="mt-4 pl-4">
                <h3 className="font-semibold text-gray-700 mb-2">Sub Departments:</h3>
                {getSubDepartmentsByHead(hd._id).map((sd) => (
                  <div key={sd._id} className="text-sm bg-white p-2 rounded mb-2 border-l-2 border-gray-300">
                    <span className="font-semibold">{sd.name}</span>
                    <span className="text-gray-500 text-xs ml-2">({sd.code})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrganizationHierarchyExample
