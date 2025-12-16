const AttendanceTable = ({ days, data }) => {
  const getStatusColor = (status, rowType) => {
    if (rowType === 'Status') {
      if (status === 'present') return 'bg-green-100 text-green-900 font-semibold';
      if (status === 'absent') return 'bg-red-100 text-red-900 font-semibold';
      if (status === 'halfday') return 'bg-yellow-100 text-yellow-900 font-semibold';
      if (status === 'leave') return 'bg-blue-100 text-blue-900 font-semibold';
      return 'bg-gray-100 text-gray-500';
    }
    return status ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-400';
  };

  const getStatusBadge = (status) => {
    if (!status) return '--';
    const statusMap = {
      'present': { label: 'P', bg: 'bg-green-500' },
      'absent': { label: 'A', bg: 'bg-red-500' },
      'halfday': { label: 'H', bg: 'bg-yellow-500' },
      'leave': { label: 'L', bg: 'bg-blue-500' }
    };
    const s = statusMap[status] || { label: status, bg: 'bg-gray-500' };
    return <span className={`${s.bg} text-white px-2 py-1 rounded text-xs font-bold`}>{s.label}</span>;
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow main-scroll">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
            <th className="border px-4 py-3 text-left font-semibold sticky left-0 bg-gray-900 z-10 whitespace-nowrap">Type</th>
            {days.map((d) => (
              <th key={d.date} className="border px-4 py-3 text-center font-semibold min-w-20 whitespace-nowrap">
                <div className="text-xs">{d.date}</div>
                <div className="text-xs font-normal">{d.day}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Object.keys(data).map((row, rowIdx) => (
            <tr key={row} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
              <td className="border px-4 py-3 font-semibold sticky left-0 bg-gray-100 z-10 text-gray-700 whitespace-nowrap">
                {row}
              </td>
              {data[row].map((cell, i) => {
                const isStatus = row === 'Status';
                return (
                  <td key={i} className={`border px-4 py-3 text-center whitespace-nowrap ${getStatusColor(cell, row)}`}>
                    {isStatus ? getStatusBadge(cell) : (cell || '--')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="p-4 bg-gray-50 border-t flex gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-500 rounded flex-shrink-0"></span> <span>Present</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-500 rounded flex-shrink-0"></span> <span>Absent</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-yellow-500 rounded flex-shrink-0"></span> <span>Half-day</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-blue-500 rounded flex-shrink-0"></span> <span>Leave</span></div>
      </div>
    </div>
  )
}

export default AttendanceTable
