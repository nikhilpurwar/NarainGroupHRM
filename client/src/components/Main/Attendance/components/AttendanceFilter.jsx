const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

const AttendanceFilter = ({ filters, setFilters, onSearch }) => {
  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        <input
          type="text"
          placeholder="Employee Name or ID"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border p-2 rounded-lg"
        />

        <select
          className="border p-2 rounded-lg"
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
        >
          <option value="">Select Month</option>
          {months.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded-lg"
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
        >
          <option value="">Select Year</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>

        <button
          onClick={onSearch}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800"
        >
          Search
        </button>

        <button
          className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700"
        >
          Export
        </button>

      </div>
    </div>
  )
}

export default AttendanceFilter
