const EmployeeSummary = ({ emp }) => {
  return (
    <div className="border-b pb-3 mb-3 text-sm flex flex-wrap gap-4">
      <span><b>ID:</b> {emp.empId}</span>
      <span><b>Name:</b> {emp.name}</span>
      <span><b>Father:</b> {emp.father}</span>
      <span><b>Off:</b> {emp.off}</span>
      <span><b>Shift:</b> {emp.shift}</span>
      <span><b>Work Hrs:</b> {emp.workHours}</span>
      <span><b>OT:</b> {emp.ot}</span>
      <span><b>Days:</b> {emp.days}</span>
    </div>
  )
}

export default EmployeeSummary
