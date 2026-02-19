import React, { useMemo, useCallback } from 'react';

// Constants and Helper Functions
const STATUS_CONFIG = {
  present: { label: 'P', bg: 'bg-green-500', full: 'Present' },
  absent: { label: 'A', bg: 'bg-red-500', full: 'Absent' },
  halfday: { label: 'H', bg: 'bg-yellow-500', full: 'Half-day' },
  leave: { label: 'L', bg: 'bg-blue-500', full: 'Leave' },
  festival: { label: 'F', bg: 'bg-purple-500', full: 'Festival' },
  holiday: { label: 'F', bg: 'bg-purple-500', full: 'Festival' }
};

const ROW_COLORS = {
  'Status': (status, hasHoliday) => 
    hasHoliday ? 'bg-purple-100 text-purple-900 font-semibold' :
    status === 'present' ? 'bg-green-100 text-green-900 font-semibold' :
    status === 'absent' ? 'bg-red-100 text-red-900 font-semibold' :
    status === 'halfday' ? 'bg-yellow-100 text-yellow-900 font-semibold' :
    status === 'leave' ? 'bg-blue-100 text-blue-900 font-semibold' :
    status === 'festival' ? 'bg-purple-100 text-purple-900 font-semibold' :
    'bg-gray-100 text-gray-500',

  'In': (status) => 
    status ? 'bg-blue-50 text-blue-900 cursor-pointer hover:bg-blue-100' : 'bg-gray-50 text-gray-400',

  'Out': (status) => 
    status ? 'bg-blue-50 text-blue-900 cursor-pointer hover:bg-blue-100' : 'bg-gray-50 text-gray-400',

  'Regular Hours': (status) => 
    status ? 'bg-green-50 text-green-900 font-semibold' : 'bg-gray-50 text-gray-400',

  'Worked Hours': (status) => 
    status ? 'bg-blue-50 text-blue-900 font-semibold' : 'bg-gray-50 text-gray-400',

  'OT (Hours)': (status) => 
    status ? 'bg-orange-50 text-orange-900 font-semibold' : 'bg-gray-50 text-gray-400',

  'Total Worked Hours': (status) => 
    status ? 'bg-purple-50 text-purple-900 font-bold' : 'bg-gray-50 text-gray-400',
};

const LEGEND_ITEMS = [
  { color: 'bg-green-500', label: 'Present' },
  { color: 'bg-red-500', label: 'Absent' },
  { color: 'bg-yellow-500', label: 'Half-day' },
  { color: 'bg-blue-500', label: 'Leave' },
  { color: 'bg-purple-500', label: 'Festival' }
];

// Utility Functions
const formatHours = (hours) => {
  const n = Number(hours) || 0;
  if (!n) return '0h 0m';
  const hrs = Math.floor(n);
  const mins = Math.round((n - hrs) * 60);
  return `${hrs}h ${mins}m`;
};

const isNumeric = (v) => {
  if (v === null || typeof v === 'undefined') return false;
  return !Number.isNaN(Number(String(v).trim())) && String(v).trim() !== '';
};

const normalizeDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  const str = String(date);
  return str.includes('T') ? str.split('T')[0] : str.slice(0, 10);
};

const getMobileDayHeader = (date, dayName) => {
  const dateObj = new Date(date);
  return {
    dateNum: dateObj.getDate(),
    month: dateObj.toLocaleString('default', { month: 'short' }),
    day: dayName.slice(0, 3)
  };
};

// Custom Hooks
const useHolidayMap = (holidays) => {
  return useMemo(() => {
    const map = new Map();
    (holidays || []).forEach(h => {
      if (!h?.date) return;
      const dateStr = normalizeDate(h.date);
      if (dateStr) map.set(dateStr, h.name || '');
    });
    return map;
  }, [holidays]);
};

const useAttendanceData = (attendanceRaw) => {
  return useMemo(() => {
    const map = new Map();
    (attendanceRaw || []).forEach(a => {
      if (!a?.date) return;
      const dateStr = normalizeDate(a.date);
      if (dateStr) map.set(dateStr, a);
    });
    return map;
  }, [attendanceRaw]);
};

// Sub-components
const Legend = ({ isMobile }) => (
  <div className={`${isMobile ? 'p-3 bg-gray-50 border-t flex flex-wrap gap-3 text-xs justify-center' : 'sticky left-0 p-4 bg-gray-50 flex flex-wrap gap-4 text-xs'}`}>
    {LEGEND_ITEMS.map((item, idx) => (
      <div key={idx} className="flex items-center gap-1 sm:gap-2">
        <span className={`w-3 h-3 ${item.color} rounded flex-shrink-0`}></span>
        <span>{item.label}</span>
      </div>
    ))}
  </div>
);

const StatusBadge = ({ status, isoDate, holidayName, isMobile }) => {
  if (holidayName && status) {
    const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-500', full: status };
    
    if (isMobile) {
      return (
        <div className="flex flex-col items-center">
          <span className={`${config.bg} text-white px-1.5 py-0.5 rounded text-xs font-bold mt-1`}>
            {config.label}
          </span>
          <span className="text-[10px] text-gray-600 mt-0.5">{config.full}</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 justify-center">
        <span className={`${config.bg} text-white px-2 py-1 rounded text-xs font-bold`}>
          {config.label}
        </span>
      </div>
    );
  }

  if (holidayName) {
    return (
      <div className="flex flex-col items-center">
        <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
          F
        </span>
        <span className="text-[10px] text-gray-600 mt-0.5">{holidayName}</span>
      </div>
    );
  }

  if (!status) return '--';

  const config = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-500', full: status };

  if (isMobile) {
    return (
      <div className="flex flex-col items-center">
        <span className={`${config.bg} text-white px-1.5 py-0.5 rounded text-xs font-bold`}>
          {config.label}
        </span>
        <span className="text-[10px] text-gray-600 mt-0.5">{config.full}</span>
      </div>
    );
  }

  return (
    <span className={`${config.bg} text-white px-2 py-1 rounded text-xs font-bold`}>
      {config.label}
    </span>
  );
};

const OtCell = ({ isoDate, attendanceMap, fallback }) => {
  const otData = useMemo(() => {
    const rec = attendanceMap.get(isoDate);
    if (!rec) {
      // try fallback value from table (e.g. '7' or '7.5')
      if (isNumeric(fallback)) {
        const total = Number(fallback);
        return { dayOt: total, nightOt: 0, sundayOt: 0, festivalOt: 0, totalOt: total };
      }
      return { dayOt: 0, nightOt: 0, sundayOt: 0, festivalOt: 0, totalOt: 0 };
    }

    const dayOt = Number(rec.dayOtHours || 0);
    const nightOt = Number(rec.nightOtHours || 0);
    const sundayOt = Number(rec.sundayOtHours || 0);
    const festivalOt = Number(rec.festivalOtHours || 0);
    const totalOt = dayOt + nightOt + sundayOt + festivalOt;

    if (totalOt <= 0) return { dayOt: 0, nightOt: 0, sundayOt: 0, festivalOt: 0, totalOt: 0 };
    return { dayOt, nightOt, sundayOt, festivalOt, totalOt };
  }, [isoDate, attendanceMap, fallback]);

  if (!otData.totalOt) return '--';

  return (
    <div className="flex flex-col items-center text-[10px] leading-tight">
      <div className="flex items-center justify-between w-full font-semibold text-gray-500 border-b border-gray-300 pb-1">
        <span className="flex-1 text-center">D</span>
        <span className="flex-1 text-center">N</span>
        <span className="flex-1 text-center">S</span>
        <span className="flex-1 text-center">F</span>
      </div>
      <div className="flex items-center justify-between text-xs font-medium text-gray-800 divide-x divide-gray-300">
        <span className="flex-1 px-1 text-center">{formatHours(otData.dayOt)}</span>
        <span className="flex-1 px-1 text-center text-indigo-600">{formatHours(otData.nightOt)}</span>
        <span className="flex-1 px-1 text-center text-emerald-600">{formatHours(otData.sundayOt)}</span>
        <span className="flex-1 px-1 text-center text-orange-600">{formatHours(otData.festivalOt)}</span>
      </div>
      <div className="flex items-center justify-between w-full text-[10px] text-gray-500 border-t border-gray-200 pt-0.5">
        <span className="font-semibold">Total</span>
        <span className="ml-auto font-semibold text-gray-800">{formatHours(otData.totalOt)}</span>
      </div>
    </div>
  );
};

const InOutCell = ({ isoDate, row, fallback, attendanceMap }) => {
  const rec = attendanceMap.get(isoDate);
  if (!rec) return fallback || '--';

  // Try punchLogs first for accurate timezone display
  const logs = Array.isArray(rec.punchLogs) ? rec.punchLogs : [];
  
  if (logs.length > 0) {
    if (row === 'In') {
      const firstIn = logs.find(l => (l.punchType || '').toUpperCase() === 'IN');
      if (firstIn?.punchTime) {
        const dt = new Date(firstIn.punchTime);
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
        }
      }
    }
    
    if (row === 'Out') {
      const lastOut = [...logs].reverse().find(l => (l.punchType || '').toUpperCase() === 'OUT');
      if (lastOut?.punchTime) {
        const dt = new Date(lastOut.punchTime);
        if (!isNaN(dt.getTime())) {
          const timeStr = dt.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          });
          return (
            <div className="flex items-center justify-center gap-2">
              <span>{timeStr}</span>
              {lastOut.auto ? (
                <span className="text-[10px] px-1 py-0.5 bg-yellow-100 text-yellow-800 rounded">Auto</span>
              ) : null}
            </div>
          );
        }
      }
    }
  }

  // Fallback to stored times
  if (row === 'In' && rec.inTime) {
    const dt = new Date(rec.inTime);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    }
    return rec.inTime;
  }
  
  if (row === 'Out' && rec.outTime) {
    const dt = new Date(rec.outTime);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    }
    return rec.outTime;
  }

  return fallback || '--';
};

// Main Component
const AttendanceTable = ({ 
  days, 
  data, 
  isMobile, 
  attendanceRaw, 
  onCellClick, 
  holidays = [] 
}) => {
  const holidayMap = useHolidayMap(holidays);
  const attendanceMap = useAttendanceData(attendanceRaw);
  
  const getCellColor = useCallback((cell, row, isoDate) => {
    const hasHoliday = holidayMap.has(isoDate);
    const colorFn = ROW_COLORS[row] || (() => cell ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-400');
    return colorFn(cell, hasHoliday);
  }, [holidayMap]);

  const getDisplayDays = useMemo(() => 
    isMobile ? days.slice(0, 7) : days
  , [days, isMobile]);

  const renderCell = useCallback((row, cell, index) => {
    const isoDate = days[index]?.iso;
    const holidayName = holidayMap.get(isoDate);
    const isClickable = (row === 'In' || row === 'Out') && cell;

    let content;
    
    switch (row) {
      case 'Status':
        content = (
          <StatusBadge 
            status={cell} 
            isoDate={isoDate} 
            holidayName={holidayName} 
            isMobile={isMobile} 
          />
        );
        break;
        
      case 'OT (Hours)':
        content = <OtCell isoDate={isoDate} attendanceMap={attendanceMap} fallback={cell} />;
        break;

      case 'Regular Hours': {
        const rec = attendanceMap.get(isoDate);
        const display = rec?.regularHoursDisplay ?? (typeof rec?.regularHours !== 'undefined' ? formatHours(rec.regularHours) : (isNumeric(cell) ? formatHours(Number(cell)) : (cell || '--')));
        content = display;
        break;
      }

      case 'Worked Hours': {
        const rec = attendanceMap.get(isoDate);
        const display = rec?.totalHoursDisplay ?? (typeof rec?.totalHours !== 'undefined' ? formatHours(rec.totalHours) : (isNumeric(cell) ? formatHours(Number(cell)) : (cell || '--')));
        content = display;
        break;
      }
        
      case 'In':
      case 'Out':
        content = (
          <InOutCell 
            isoDate={isoDate} 
            row={row} 
            fallback={cell} 
            attendanceMap={attendanceMap} 
          />
        );
        break;
        
      default:
        content = cell || '--';
    }

    return (
      <td
        key={index}
        className={`border px-3 py-2 text-center whitespace-nowrap ${getCellColor(cell, row, isoDate)} ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={() => {
          if (isClickable && onCellClick) {
            onCellClick(isoDate, row);
          }
        }}
      >
        {content}
      </td>
    );
  }, [days, holidayMap, isMobile, attendanceMap, getCellColor, onCellClick]);

  if (isMobile) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="min-w-max">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                  <th className="border px-2 py-2 text-left font-semibold sticky left-0 bg-gray-900 z-10 min-w-[80px]">
                    Type
                  </th>
                  {getDisplayDays.map((d) => {
                    const mobileDay = getMobileDayHeader(d.iso, d.day);
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
                    {data[row].slice(0, 7).map((cell, i) => renderCell(row, cell, i))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-4 py-2 border-t text-center text-xs text-gray-500">
          Showing 7 days • Scroll horizontally →
        </div>
        
        <Legend isMobile={true} />
      </div>
    );
  }

  return (
    <div className="card-hover bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow overflow-auto border border-blue-200">
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
              {data[row].map((cell, i) => renderCell(row, cell, i))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <Legend isMobile={false} />
    </div>
  );
};

export default React.memo(AttendanceTable);

