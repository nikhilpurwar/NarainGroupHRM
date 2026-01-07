const AttendanceTable = ({ days, data, isMobile, attendanceRaw, onCellClick, holidays = [] }) => {
  const isHoliday = (isoDate) => {
    return (holidays || []).some(h => {
      const hDate = h.date ? (typeof h.date === 'string' ? h.date : h.date.split('T')[0]) : null
      return hDate === isoDate
    })
  }

  const getStatusColor = (status, rowType, isoDate) => {
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
    if (rowType === 'Regular Hours') {
      return status ? 'bg-green-50 text-green-900 font-semibold' : 'bg-gray-50 text-gray-400';
    }
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

  // Helpers to split a day's OT into D/N/S/F buckets using backend OT fields
  const getOtBucketsForDate = (isoDate) => {
    if (!isoDate || !Array.isArray(attendanceRaw)) {
      return { dayOt: 0, nightOt: 0, sundayOt: 0, festivalOt: 0, totalOt: 0 };
    }

    const rec = attendanceRaw.find(a => a?.date && String(a.date).startsWith(isoDate));
    if (!rec) {
      return { dayOt: 0, nightOt: 0, sundayOt: 0, festivalOt: 0, totalOt: 0 };
    }

    const dayOt = Number(rec.dayOtHours || 0);
    const nightOt = Number(rec.nightOtHours || 0);
    const sundayOt = Number(rec.sundayOtHours || 0);
    const festivalOt = Number(rec.festivalOtHours || 0);
    const totalOt = dayOt + nightOt + sundayOt + festivalOt;

    return { dayOt, nightOt, sundayOt, festivalOt, totalOt };
  };

  const renderOtCell = (isoDate) => {
    const { dayOt, nightOt, sundayOt, festivalOt, totalOt } = getOtBucketsForDate(isoDate);

    if (!totalOt) return '--';

    return (
      <div className="flex flex-col items-center gap-0.5 text-[10px] leading-tight">
        <div className="flex items-center justify-between w-full font-semibold text-gray-500">
          <span className="flex-1 text-center">D</span>
          <span className="flex-1 text-center">N</span>
          <span className="flex-1 text-center">S</span>
          <span className="flex-1 text-center">F</span>
        </div>
        <div className="flex items-center justify-between w-full font-medium text-gray-800">
          <span className="flex-1 text-center">{dayOt.toFixed(2)}</span>
          <span className="flex-1 text-center text-indigo-600">{nightOt.toFixed(2)}</span>
          <span className="flex-1 text-center text-emerald-600">{sundayOt.toFixed(2)}</span>
          <span className="flex-1 text-center text-orange-600">{festivalOt.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between w-full text-[10px] text-gray-500 border-t border-gray-200 pt-0.5 mt-0.5">
          <span className="font-semibold">Total</span>
          <span className="ml-auto font-semibold text-gray-800">{totalOt.toFixed(2)}h</span>
        </div>
      </div>
    );
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
                          {isStatus
                            ? getStatusBadge(cell, isoDate)
                            : (row === 'OT (Hours)' ? renderOtCell(isoDate) : (cell || '--'))}
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
    <div className="card-hover bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow overflow-auto border border-blue-200">

      {/* Shows total Present and Absent of seleted month and year from filter */}
      {/* compute present/absent from Status row (ignore holidays) */}
      {/* <div className="sticky left-0 flex gap-6 p-6">
        {(() => {
          const statusRow = (data && data['Status']) || [];
          let presentCount = 0;
          let absentCount = 0;
          for (let i = 0; i < statusRow.length; i++) {
            const s = statusRow[i];
            const iso = days && days[i] ? days[i].iso : null;
            if (isHoliday(iso)) continue;
            if (!s) continue;
            const st = (String(s) || '').toLowerCase();
            if (st === 'present' || st === 'halfday') presentCount++;
            else if (st === 'absent') absentCount++;
          }

          const firstIso = days && days[0] ? days[0].iso : null;
          const monthLabel = firstIso ? new Date(firstIso).toLocaleString('default', { month: 'long' }) : '';
          const yearLabel = firstIso ? new Date(firstIso).getFullYear() : '';

          return (
            <>
              <div className="flex justify-between items-center w-xs bg-green-100 rounded-lg p-3 sm:p-4 border-l-4 border-green-600 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col justify-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold uppercase">Present</span>
                  <div className="text-lg sm:text-xl font-bold text-gray-800 truncate">{presentCount}</div>
                </div>
                <div className="flex flex-col text-end text-gray-300 text-2xl font-bold">
                  <span title="Selected month from filter">{monthLabel}</span>
                  <span title="Selected year from filter">{yearLabel}</span>
                </div>
              </div>

              <div className="flex justify-between items-center w-xs bg-red-100 rounded-lg p-3 sm:p-4 border-l-4 border-red-600 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col justify-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold uppercase">Absent</span>
                  <div className="text-lg sm:text-xl font-bold text-gray-800 truncate">{absentCount}</div>
                </div>
                <div className="flex flex-col text-end text-gray-300 text-2xl font-bold">
                  <span title="Selected month from filter">{monthLabel}</span>
                  <span title="Selected year from filter">{yearLabel}</span>
                </div>
              </div>
            </>
          );
        })()}
      </div> */}

      {/* Attendance-Report Table */}
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
                    {isStatus
                      ? getStatusBadge(cell, isoDate)
                      : (row === 'OT (Hours)' ? renderOtCell(isoDate) : (cell || '--'))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sticky left-0 p-4 bg-gray-50 flex flex-wrap gap-4 text-xs">
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