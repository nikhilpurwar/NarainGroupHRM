import React, { memo } from 'react';
import { Eye, BanknoteArrowUp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SalaryTableRow = memo(({
  item,
  serialNumber,
  onView,
  onDownloadPDF,
  onLoanDeductChange
}) => {
   const navigate = useNavigate();

  // const formatDaysHoursMinutes = (hours, hoursPerDay = 8) => {
  //   if (!hours && hours !== 0) return '0d 0h 0m';

  //   // convert total hours into minutes
  //   const totalMinutes = Math.round(hours * 60);

  //   // calculate days, hours, minutes
  //   const days = Math.floor(totalMinutes / (hoursPerDay * 60));
  //   const remainingMinutesAfterDays = totalMinutes % (hoursPerDay * 60);

  //   const h = Math.floor(remainingMinutesAfterDays / 60);
  //   const m = remainingMinutesAfterDays % 60;

  //   return `${days}d ${h}h ${m}m`;
  // };
  const splitDaysHoursMinutes = (hours) => {
    if (!hours && hours !== 0) return { d: 0, h: 0, m: 0 };

    const totalMinutes = Math.round(hours * 60);

    const d = Math.floor(totalMinutes / ((item.shiftHours || 8) * 60));
    const remainingMinutesAfterDays = totalMinutes % ((item.shiftHours || 8) * 60);

    const h = Math.floor(remainingMinutesAfterDays / 60);
    const m = remainingMinutesAfterDays % 60;

    return { d, h, m };
  };

  const isDailySalary = item.empType === 'Daily Salary';
  const monthlySalaryValue = isDailySalary ? 0 : (item.salary || 0);
  const dailySalaryValue = isDailySalary ? (item.salary || 0) : (item.salaryPerDay || 0);

  return (
    <tr className="hover:bg-gray-50 transition ">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{serialNumber}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.empId}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-800">
              {item.empName?.charAt(0) || 'E'}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 cursor-pointer" onClick={()=>navigate("/attReport")}>{item.empName}</div>
            <div className="text-xs text-gray-500">{item.department || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {item.group || 'N/A'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{monthlySalaryValue.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{dailySalaryValue.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{item.salaryPerHour?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-center">
        <div className={`border-b items-center px-3 py-1 rounded-full text-xs cursor-pointer font-medium ${item.presentDays >= 22 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`} onClick={()=>navigate('/attReport')} >
          {item.presentDays}
        </div>
        <small
          title="Sunday (S) and Festival (F) auto-pay day counts"
          className="font-semibold text-gray-700 block mt-1"
        >
          S: {item.sundayAutoPayDays ?? 0} | F: {item.festivalAutoPayDays ?? 0}
        </small>
      </td>

      {/* basic hours */}
      <td className="px-4 py-3 text-center bg-gray-50">
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {splitDaysHoursMinutes(item.basicHours).d} Shift
          </span>

          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {splitDaysHoursMinutes(item.basicHours).h}h {splitDaysHoursMinutes(item.basicHours).m}m
          </span>

          <span className="text-xs text-gray-500 whitespace-nowrap">
            ({item.basicHours}H)
          </span>
        </div>
      </td>

       {/* Auto-pay amount (e.g., Sunday/Festival autopay) */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{(item.autoPayAmount || 0).toLocaleString()}</td>
      <td className="px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50 border">₹{item.basicPay?.toLocaleString() || '0'}</td>


      {/* ot hours */}
      {/* <td className="px-4 py-3 text-center bg-gray-50">
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {splitDaysHoursMinutes(item.otHours).d} Shift
          </span>
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {splitDaysHoursMinutes(item.otHours).h}h {splitDaysHoursMinutes(item.otHours).m}m
          </span>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            ({item.otHours}H)
          </span>
        </div>
      </td> */}

      {/* OT breakdown (D/N/S/F) */}
      <td className="bg-gray-50 text-sm px-2 py-4 border-b">
        <div className="inline-flex flex-col w-full">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-500 border-b border-gray-300 pb-1 mb-1">
            <span className="flex-1 text-center">D</span>
            <span className="flex-1 text-center">N</span>
            <span className="flex-1 text-center">S</span>
            <span className="flex-1 text-center">F</span>
          </div>
          {(() => {
            const dayOt = Number(item.dayOtHours || 0);
            const nightOt = Number(item.nightOtHours || 0);
            const sundayOt = Number(item.sundayOtHours || 0);
            const festivalOt = Number(item.festivalOtHours || 0);

            const allowDayOT = item.allowDayOT !== false;
            const allowNightOT = item.allowNightOT !== false;
            const allowSundayOT = item.allowSundayOT !== false;
            const allowFestivalOT = item.allowFestivalOT !== false;

            const totalOt = (dayOt + nightOt + sundayOt + festivalOt).toFixed(2);
            const payableOt = Number(item.otHours || 0).toFixed(2);

            return (
              <>
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-gray-800 divide-x divide-gray-300">
                  <span
                    className={`px-1 flex-1 text-center ${(!allowDayOT && dayOt > 0) ? 'line-through text-gray-400' : ''}`}
                    title={!allowDayOT && dayOt > 0 ? 'Not paid due to salary rule' : undefined}
                  >
                    {dayOt.toFixed(2)}
                  </span>
                  <span
                    className={`px-1 flex-1 text-center text-indigo-600 ${(!allowNightOT && nightOt > 0) ? 'line-through text-gray-400' : ''}`}
                    title={!allowNightOT && nightOt > 0 ? 'Not paid due to salary rule' : undefined}
                  >
                    {nightOt.toFixed(2)}
                  </span>
                  <span
                    className={`px-1 flex-1 text-center text-emerald-600 ${(!allowSundayOT && sundayOt > 0) ? 'line-through text-gray-400' : ''}`}
                    title={!allowSundayOT && sundayOt > 0 ? 'Not paid due to salary rule' : undefined}
                  >
                    {sundayOt.toFixed(2)}
                  </span>
                  <span
                    className={`px-1 flex-1 text-center text-orange-600 ${(!allowFestivalOT && festivalOt > 0) ? 'line-through text-gray-400' : ''}`}
                    title={!allowFestivalOT && festivalOt > 0 ? 'Not paid due to salary rule' : undefined}
                  >
                    {festivalOt.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-300 pt-1">
                  <span className="font-semibold">Total</span>
                  <span className="ml-auto font-semibold text-gray-800">{totalOt}h</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                  <span className="font-semibold">Payable</span>
                  <span className="ml-auto font-semibold text-gray-800">{payableOt}h</span>
                </div>
              </>
            );
          })()}
        </div>
      </td>

      <td className="px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50 border">₹{item.otPay?.toLocaleString() || '0'}</td>
      {/* total hours */}
      <td className="px-4 py-3 text-center">
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {splitDaysHoursMinutes(item.totalHours).d} Shift
          </span>

          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {splitDaysHoursMinutes(item.totalHours).h}h {splitDaysHoursMinutes(item.totalHours).m}m
          </span>

          <span className="text-xs text-gray-500 whitespace-nowrap">
            ({item.totalHours}H)
          </span>
        </div>
      </td>

      <td className="px-4 py-3 text-sm font-bold text-green-700 bg-green-50 border">₹{item.totalPay?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{item.tds?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{item.pTax?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{item.lwf?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{item.esi?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900 bg-gray-50">₹{item.basicPF?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-blue-700 bg-blue-50">₹{item.otPF?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{item.insurance?.toLocaleString() || '0'}</td>
    <td className="px-4 py-3 text-sm text-gray-900 cursor-pointer hover:text-blue-600"
     onClick={() => {
    if (!item.advance || item.advance === 0) {
      navigate("/advance");
    } else {
      navigate("/advance", {
        state: {
          employeeId: item.employeeId || item.empId,
        },
      });
    }
  }}
>
  ₹{item.advance?.toLocaleString() || '0'}
</td>

      <td className="px-4 py-3 text-sm text-gray-900">₹{item.loanPending?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">₹{item.loanReceived?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">
        <input
          type="number"
          className="w-auto min-w-20 max-w-25 border rounded px-2 py-1"
          value={item.loanDeduct || 0}
          onChange={(e) => onLoanDeductChange(item, Number(e.target.value))}
        />
      </td>
      <td className="px-4 py-3 text-sm font-bold text-yellow-700 bg-yellow-50 border">₹{item.totalDeductions?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50 border">₹{item.netPay?.toLocaleString() || '0'}</td>
      <td className="px-4 py-3 text-sm text-center">
        <div className="flex items-center justify-center gap-2">
          {item.status === 'Paid' ? (
            <button
              onClick={() => onView(item)}
              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition cursor-pointer"
              title="View Details"
            >
              <Eye size={20} className='hover:scale-110' />
            </button>
          ) : (
            <button
              onClick={() => onView(item)}
              disabled={item.status === 'Paid'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${item.status === 'Paid' ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-green-600 hover:bg-green-100'}`}
              title={item.status === 'Paid' ? 'Already Paid' : 'Mark as Paid'}
            >
              <BanknoteArrowUp size={22} className='hover:scale-110' />
            </button>
          )}
          <button
            onClick={() => onDownloadPDF(item)}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition cursor-pointer"
            title="Download PDF"
          >
            <FileText size={20} className='hover:scale-110' />
          </button>
        </div>
      </td>
    </tr>
  );
});

SalaryTableRow.displayName = 'SalaryTableRow';

export default SalaryTableRow;
