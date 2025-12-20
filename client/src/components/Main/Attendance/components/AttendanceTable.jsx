const AttendanceTable = ({ days, data, isMobile, attendanceRaw, onCellClick, holidays = [] }) => {
  const isHoliday = (isoDate) => {
    return (holidays || []).some(h => {
      const hDate = h.date ? (typeof h.date === 'string' ? h.date : h.date.split('T')[0]) : null
      return hDate === isoDate
    })
  }

  const getStatusColor = (status,  rowType, isoDate) => {
    if (rowType === 'Status') {
      if (isHoliday(isoDate)) return 'bg-purple-100 text-purple-900 font-semibold';
      if (status === 'present') return 'bg-green-100 text-green-900 font-semibold';
      if (status === 'absent') return 'bg-red-100 text-red-900 font-semibold';
      if (status === 'halfday') return 'bg-yellow-100 text-yellow-900 font-semibold';
      if (status === 'leave') return 'bg-blue-100 text-blue-900 font-semibold';
      return 'bg-gray-100 text-gray-500';
    }
    if (rowType === 'In' || rowType === 'Out') {
      return status ? 'bg-blue-50 text-blue-900 cursor-pointer hover:bg-blue-100' : 'bg-gray-50 text-gray-400';
    }
    // if (rowType === 'Regular Hours') {
    //   return status ? 'bg-green-50 text-green-900 font-semibold' : 'bg-gray-50 text-gray-400';
    // }
    if (rowType === 'Worked Hours') {
      return status ? 'bg-blue-50 text-blue-900 font-semibold' : 'bg-gray-50 text-gray-400';
    }
    if (rowType === 'OT (Hours)') {
      return status ? 'bg-orange-50 text-orange-900 font-semibold' : 'bg-gray-50 text-gray-400';
    }
    if (rowType === 'Total Worked Hours') {
      return status ? 'bg-purple-50 text-purple-900 font-bold' : 'bg-gray-50 text-gray-400';
    }
    return status ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-400';
  };

  const getStatusBadge = (status, isoDate) => {
    if (isHoliday(isoDate)) {
      return (
        <div className="flex flex-col items-center">
          <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
            F
          </span>
          <span className="text-[10px] text-gray-600 mt-0.5">Festival</span>
        </div>
      )
    }
    if (!status) return '--';
    const statusMap = {
      'present': { label: 'P', bg: 'bg-green-500', full: 'Present' },
      'absent': { label: 'A', bg: 'bg-red-500', full: 'Absent' },
      'halfday': { label: 'H', bg: 'bg-yellow-500', full: 'Half-day' },
      'leave': { label: 'L', bg: 'bg-blue-500', full: 'Leave' }
    };
    const s = statusMap[status] || { label: status, bg: 'bg-gray-500', full: status };
    
    if (isMobile) {
      return (
        <div className="flex flex-col items-center">
          <span className={`${s.bg} text-white px-1.5 py-0.5 rounded text-xs font-bold`}>
            {s.label}
          </span>
          <span className="text-[10px] text-gray-600 mt-0.5">{s.full}</span>
        </div>
      );
    }
    
    return <span className={`${s.bg} text-white px-2 py-1 rounded text-xs font-bold`}>{s.label}</span>;
  };

  const getMobileDayHeader = (date, day) => {
    const dateObj = new Date(date);
    return {
      dateNum: dateObj.getDate(),
      month: dateObj.toLocaleString('default', { month: 'short' }),
      day: day.slice(0, 3)
    };
  };

  if (isMobile) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile scrollable container */}
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="min-w-max">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                  <th className="border px-2 py-2 text-left font-semibold sticky left-0 bg-gray-900 z-10 min-w-[80px]">
                    <div>Type</div>
                  </th>
                  {days.slice(0, 7).map((d) => { // Show only first 7 days on mobile
                    const mobileDay = getMobileDayHeader(d.date, d.day);
                    return (
                      <th key={d.date} className="border px-1 py-2 text-center font-semibold min-w-[60px]">
                        <div className="text-[10px]">{mobileDay.dateNum}</div>
                        <div className="text-[10px] font-normal">{mobileDay.month}</div>
                        <div className="text-[10px] font-normal">{mobileDay.day}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {Object.keys(data).map((row, rowIdx) => (
                  <tr key={row} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-2 py-2 font-semibold sticky left-0 bg-gray-100 z-10 text-gray-700 min-w-[80px] text-xs">
                      {row === 'Status' ? 'Status' : row === 'Hours' ? 'Hours' : row}
                    </td>
                    {data[row].slice(0, 7).map((cell, i) => {
                      const isStatus = row === 'Status';
                      const isInOut = row === 'In' || row === 'Out';
                      const isoDate = days[i]?.iso;
                      const isClickable = isInOut && cell;

                      return (
                        <td
                          key={i}
                          className={`border px-1 py-2 text-center ${getStatusColor(cell, row, isoDate)} ${isClickable ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (isClickable && onCellClick) {
                              onCellClick(isoDate, row);
                            }
                          }}
                        >
                          {isStatus ? getStatusBadge(cell, isoDate) : (cell || '--')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination indicator for mobile */}
        <div className="px-4 py-2 border-t text-center text-xs text-gray-500">
          Showing 7 days • Scroll horizontally →
        </div>

        {/* Legend - Mobile optimized */}
        <div className="p-3 bg-gray-50 border-t flex flex-wrap gap-3 text-xs justify-center">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded"></span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded"></span>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-500 rounded"></span>
            <span>Half-day</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded"></span>
            <span>Leave</span>
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet View
  return (
    <div className="bg-white rounded-xl shadow overflow-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
            <th className="border px-4 py-3 text-left font-semibold sticky left-0 bg-gray-900 z-10 whitespace-nowrap min-w-[120px]">
              Type
            </th>
            {days.map((d) => (
              <th key={d.date} className="border px-3 py-2 text-center font-semibold min-w-[70px] whitespace-nowrap">
                <div className="text-xs">{d.date}</div>
                <div className="text-xs font-normal">{d.day}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Object.keys(data).map((row, rowIdx) => (
            <tr key={row} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
              <td className="border px-4 py-3 font-semibold sticky left-0 bg-gray-100 z-10 text-gray-700 whitespace-nowrap min-w-[120px]">
                {row}
              </td>
              {data[row].map((cell, i) => {
                const isStatus = row === 'Status';
                const isInOut = row === 'In' || row === 'Out';
                const isoDate = days[i]?.iso;
                const isClickable = isInOut && cell;

                return (
                  <td
                    key={i}
                    className={`border px-3 py-2 text-center whitespace-nowrap ${getStatusColor(cell, row, isoDate)} ${isClickable ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (isClickable && onCellClick) {
                        onCellClick(isoDate, row);
                      }
                    }}
                  >
                    {isStatus ? getStatusBadge(cell, isoDate) : (cell || '--')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sticky left-0 p-4 bg-gray-50 border-t flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded flex-shrink-0"></span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded flex-shrink-0"></span>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-500 rounded flex-shrink-0"></span>
          <span>Half-day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded flex-shrink-0"></span>
          <span>Leave</span>
        </div>
      </div>
    </div>
  )
}

export default AttendanceTable