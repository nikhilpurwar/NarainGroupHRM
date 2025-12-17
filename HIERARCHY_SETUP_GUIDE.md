# Employee Hierarchy Setup Guide

## Overview
This guide walks you through implementing the organizational hierarchy system based on designations, departments, groups, and reporting relationships.

---

## 1. DATABASE SCHEMA UPDATES ✅

The following files have been updated to support the hierarchy:

### Backend Models Updated:
- `server/src/models/setting.model/department.model.js`
  - Enhanced `HeadDepartment` with: `code`, `description`, `reportsTo`, `hierarchy`
  - Enhanced `SubDepartment` with: `code`, `description`, `reportsTo`, `hierarchy`
  - Enhanced `Group` with: `code`, `section` (PLANT|OFFICE|FINISH), `reportsTo`, `hierarchy`
  - **NEW** `Designation` model: maps designations to groups with reporting structure

- `server/src/models/employee.model.js`
  - Changed `headDepartment`, `subDepartment`, `group` from String to ObjectId references
  - **NEW** `designation` field (ObjectId reference to Designation)
  - **NEW** `reportsTo` field (ObjectId reference to another Employee)

---

## 2. BACKEND SETUP

### Step 1: Update API Routes

File: `server/src/routes/setting.route.js` ✅

New endpoints added:
```
GET    /api/settings/designations
POST   /api/settings/designations
PUT    /api/settings/designations/:id
DELETE /api/settings/designations/:id
```

### Step 2: Update Controllers

File: `server/src/controllers/setting.controller.js` ✅

New functions added:
- `listDesignations()` - Fetch all designations with group/reporting info
- `createDesignation()` - Create new designation
- `updateDesignation()` - Update designation
- `deleteDesignation()` - Delete designation

File: `server/src/controllers/employee.controller.js` ✅

Updated to populate references:
- `getEmployees()` - now populates headDepartment, subDepartment, group, designation, reportsTo
- `getEmployeeById()` - same population
- `getEmployeeProfile()` - same population

### Step 3: Seed Database with Hierarchy Data

Run the seed script to insert the complete organizational hierarchy:

```bash
cd server
node scripts/seedHierarchy.js
```

This will create:
- **9 Groups** (PLANT, OFFICE, FINISH sections)
- **26 Designations** (Plant Head, Foreman, Operators, Office Staff, Finish roles)
- **3 Head Departments** (Plant Operations, Office & Admin, Finishing)
- **8 Sub Departments** (Production, Maintenance, QC, Logistics, HR, Accounts, Admin, Finishing Ops)

**Output Example:**
```
✅ MongoDB Connected
🗑️  Cleared existing data...
✅ Groups created: 9
✅ Designations created: 26
✅ Head Departments created: 3
✅ Sub Departments created: 8
✅ Hierarchy seed completed successfully!
```

---

## 3. FRONTEND SETUP

### Step 1: Add Hierarchy Context

File: `client/src/context/HierarchyContext.jsx` ✅

This context provides:
- `headDepartments` - list of all head departments
- `subDepartments` - list of all sub departments
- `groups` - list of all groups
- `designations` - list of all designations
- `getSubDepartmentsByHead(headId)` - filter sub-departments by parent
- `getDesignationsByGroup(groupId)` - filter designations by group
- `getGroupsBySection(section)` - filter groups by section (PLANT|OFFICE|FINISH)

### Step 2: Wrap App with Provider

In `client/src/App.jsx`, wrap your main app component:

```jsx
import { HierarchyProvider } from './context/HierarchyContext'

function App() {
  return (
    <HierarchyProvider>
      {/* Your app routes */}
    </HierarchyProvider>
  )
}
```

### Step 3: Update Employee Forms

When creating/editing employees, use the hierarchy context:

Example in `client/src/components/Main/All Employees/components/AddEditEmployee.jsx`:

```jsx
import { useHierarchy } from '../../../../context/HierarchyContext'

const AddEditEmployee = () => {
  const { headDepartments, getSubDepartmentsByHead, getDesignationsByGroup } = useHierarchy()
  const [formData, setFormData] = useState({
    headDepartment: '',
    subDepartment: '',
    designation: '',
    // ...
  })

  const filteredSubDepts = formData.headDepartment 
    ? getSubDepartmentsByHead(formData.headDepartment)
    : []

  const filteredDesignations = formData.group
    ? getDesignationsByGroup(formData.group)
    : []

  return (
    <form>
      <select 
        value={formData.headDepartment} 
        onChange={(e) => setFormData({ ...formData, headDepartment: e.target.value })}
      >
        <option value="">Select Head Department</option>
        {headDepartments.map(hd => (
          <option key={hd._id} value={hd._id}>{hd.name}</option>
        ))}
      </select>

      <select 
        value={formData.subDepartment}
        onChange={(e) => setFormData({ ...formData, subDepartment: e.target.value })}
      >
        <option value="">Select Sub Department</option>
        {filteredSubDepts.map(sd => (
          <option key={sd._id} value={sd._id}>{sd.name}</option>
        ))}
      </select>

      <select 
        value={formData.designation}
        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
      >
        <option value="">Select Designation</option>
        {filteredDesignations.map(d => (
          <option key={d._id} value={d._id}>{d.name}</option>
        ))}
      </select>
    </form>
  )
}
```

---

## 4. ORGANIZATION HIERARCHY REFERENCE

```
PLANT SECTION (8 Hours)
├── Group A: Plant Head / Unit Head
├── Group B: Senior Foreman, Foreman, Shift Foreman
├── Group C: Production Manager, Maintenance Manager, Quality Manager
├── Group D: Senior Operator, Machine Operator, Technician, Helper
└── Group E: Driver

OFFICE SECTION (8 Hours)
├── Group B: Admin Head, HR Manager, Accounts Head
└── Group A: Accountant, Clerk, Data Entry Operator, Office Assistant

FINISH SECTION (10 Hours + OT)
├── Finish Supervisor
└── Senior Finisher, Finishing Operator, Helper
```

---

## 5. DATABASE QUERIES

### Get All Employees with Full Hierarchy:
```javascript
const employees = await Employee.find()
  .populate('headDepartment')
  .populate('subDepartment')
  .populate('group')
  .populate('designation')
  .populate('reportsTo', 'name empId')
```

### Get Employees by Designation:
```javascript
const operators = await Employee.find()
  .populate('designation')
  .exec()
  .then(emps => emps.filter(e => e.designation?.code === 'DES_MO'))
```

### Get Direct Reports of Manager:
```javascript
const managerId = '...'
const directReports = await Employee.find({ reportsTo: managerId })
  .populate('designation')
```

---

## 6. NEXT STEPS (Frontend Enhancements)

Once the backend is running and seeded:

1. **Update Employee List View** (`AllEmployees.jsx`)
   - Display designation in employee table
   - Add filter by department/group/designation

2. **Update Employee Profile** (`Profile.jsx`)
   - Show reporting structure (who they report to)
   - Show their direct reports

3. **Create Organization Chart** (New component)
   - Visual hierarchy tree
   - Shows reporting relationships

4. **Update Manage Users** (`ManageUsers.jsx`)
   - Use new designation field
   - Add role-based permissions tied to groups

---

## 7. TROUBLESHOOTING

**Issue**: Schema migration errors
- **Solution**: Make sure MongoDB is running and `MONGO_URL` is set in `.env`

**Issue**: Seed script fails to insert
- **Solution**: Check that all required fields are present; re-run the script

**Issue**: Frontend shows no designations
- **Solution**: Verify `HierarchyProvider` wraps your app; check network tab for API calls

---

## Files Modified/Created

✅ Backend:
- `server/src/models/setting.model/department.model.js` (updated)
- `server/src/models/employee.model.js` (updated)
- `server/src/controllers/setting.controller.js` (updated)
- `server/src/routes/setting.route.js` (updated)
- `server/src/controllers/employee.controller.js` (updated)
- `server/scripts/seedHierarchy.js` (new)

✅ Frontend:
- `client/src/context/HierarchyContext.jsx` (new)

📝 Next (Frontend Integration):
- Update `AddEditEmployee.jsx` to use context
- Update `AllEmployees.jsx` to display designation
- Update profile views

---

## Quick Start

### Terminal 1 - Backend:
```bash
cd server
npm install
node scripts/seedHierarchy.js
npm run dev
```

### Terminal 2 - Frontend:
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` and test employee creation with new hierarchy fields!
