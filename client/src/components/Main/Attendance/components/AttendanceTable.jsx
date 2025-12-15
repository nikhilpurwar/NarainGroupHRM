const AttendanceTable = ({ days, data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Day</th>
            {days.map((d) => (
              <th key={d.date} className="border p-2">
                {d.date}<br />{d.day}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Object.keys(data).map((row) => (
            <tr key={row}>
              <td className="border p-2 font-semibold">{row}</td>
              {data[row].map((cell, i) => (
                <td key={i} className="border p-2 text-center">
                  {cell || "--"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AttendanceTable
