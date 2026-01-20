import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import MonthlySummary from "../models/monthlySummary.model.js";
import Holiday from "../models/setting.model/holidays.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
import { getIO } from "../utils/socket.util.js";
import salaryRecalcService from "../services/salaryRecalculation.service.js";
import { getSalaryRuleForSubDepartment } from "../services/salary.service.js";

// Helper Functions
const getMonthDays = (year, month) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const mm = String(m).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${y}-${mm}-${dd}`;
    const dateObj = new Date(y, m - 1, day);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    return { date: dd, iso, day: dayName };
  });
};

const getHolidayMap = (holidays) => {
  const map = new Map();
  holidays?.forEach(h => {
    if (!h?.date) return;
    const dateStr = h.date instanceof Date 
      ? h.date.toISOString().slice(0, 10)
      : String(h.date).split('T')[0];
    if (dateStr) map.set(dateStr, h.name || '');
  });
  return map;
};

const computeAttendanceData = async (att, emp, todayForClamp) => {
  if (!att?.punchLogs?.length) return att;

  const shiftCfg = await attendanceService.getShiftConfig();
  let shiftHours = 8;

  if (emp.shift) {
    const match = String(emp.shift).match(/(\d+(?:\.\d+)?)/);
    if (match) shiftHours = Math.max(Number(match[1]) || shiftHours, shiftHours);
  }

  shiftHours = shiftCfg.shiftHours > 0 ? shiftCfg.shiftHours : shiftHours;

  let nowForAttendance = new Date();
  const attendanceDate = att.date ? new Date(att.date) : null;

  if (attendanceDate) {
    const dayStart = new Date(attendanceDate);
    dayStart.setHours(0, 0, 0, 0);
    
    if (dayStart < todayForClamp) {
      const boundaryHour = (shiftCfg.boundaryHour >= 0 && shiftCfg.boundaryHour <= 23) 
        ? shiftCfg.boundaryHour 
        : 7;
      const endOfDay = new Date(dayStart);
      endOfDay.setDate(endOfDay.getDate() + 1);
      endOfDay.setHours(boundaryHour, 0, 0, 0);
      nowForAttendance = endOfDay;
    }
  }

  const computed = attendanceService.computeTotalsFromPunchLogs(
    att.punchLogs,
    shiftHours,
    {
      countOpenAsNow: true,
      now: nowForAttendance,
      dayMeta: { isWeekend: att.isWeekend, isHoliday: att.isHoliday }
    }
  );

  return {
    ...att,
    totalHours: computed.totalHours,
    regularHours: computed.regularHours,
    overtimeHours: computed.overtimeHours,
    totalMinutes: computed.totalMinutes,
    totalHoursDisplay: computed.totalHoursDisplay,
    regularHoursDisplay: computed.regularHoursDisplay,
    overtimeHoursDisplay: computed.overtimeHoursDisplay,
    dayOtHours: computed.dayOtHours,
    nightOtHours: computed.nightOtHours,
    sundayOtHours: computed.sundayOtHours,
    festivalOtHours: computed.festivalOtHours,
    _computedPairs: computed.pairs
  };
};

const isWeekend = (date, workingDaysPerWeek = 6) => {
  const dayOfWeek = date.getDay();
  if (workingDaysPerWeek === 6) return dayOfWeek === 0;
  if (workingDaysPerWeek === 5) return dayOfWeek === 0 || dayOfWeek === 6;
  return dayOfWeek === 0 || dayOfWeek === 6;
};

const buildAttendanceRows = async (days, attMap, holidayMap, emp, today) => {
  const rule = await getSalaryRuleForSubDepartment(emp.subDepartment?._id || emp.subDepartment);
  const workingDaysPerWeek = rule?.workingDaysPerWeek || 6;
  
  const rows = {
    status: [], in: [], out: [],
    worked: [], regular: [], ot: [], note: []
  };

  const empJoiningDate = emp.createdAt ? new Date(emp.createdAt) : null;
  empJoiningDate?.setHours(0, 0, 0, 0);

  for (const day of days) {
    const rec = attMap[day.iso];
    const dayDate = new Date(day.iso);
    dayDate.setHours(0, 0, 0, 0);
    
    const pastDate = dayDate < today;
    const afterJoining = !empJoiningDate || dayDate >= empJoiningDate;
    const weekend = isWeekend(dayDate, workingDaysPerWeek);
    const holidayName = holidayMap.get(day.iso);

    if (rec) {
      rows.status.push(rec.status || (holidayName ? 'festival' : 'present'));
      rows.in.push(rec.inTime || '');
      rows.out.push(rec.outTime || '');
      rows.worked.push(rec.totalHoursDisplay || String(rec.totalHours || ''));
      rows.regular.push(rec.regularHoursDisplay || String(rec.regularHours || ''));
      rows.ot.push(rec.overtimeHoursDisplay || String(rec.overtimeHours || ''));
      rows.note.push(rec.note || holidayName || '');
    } else if (holidayName) {
      rows.status.push('festival');
      rows.in.push(''); rows.out.push('');
      rows.worked.push(''); rows.regular.push(''); rows.ot.push('');
      rows.note.push(holidayName);
    } else if (pastDate && !weekend && afterJoining) {
      rows.status.push('absent');
      rows.in.push(''); rows.out.push('');
      rows.worked.push(''); rows.regular.push(''); rows.ot.push('');
      rows.note.push('Not marked');
    } else {
      rows.status.push(null); rows.in.push(null); rows.out.push(null);
      rows.worked.push(null); rows.regular.push(null); rows.ot.push(null);
      rows.note.push(null);
    }
  }

  return {
    Status: rows.status,
    In: rows.in,
    Out: rows.out,
    'Worked Hours': rows.worked,
    'Regular Hours': rows.regular,
    'OT (Hours)': rows.ot,
    Note: rows.note
  };
};

const fetchEmployeeData = async (query) => {
  const employee = await Employee.findOne(query)
    .populate('headDepartment', 'name')
    .populate('subDepartment', 'name')
    .populate('designation', 'name')
    .lean();
  
  if (!employee) return null;
  
  const employeeObj = employee.toObject ? employee.toObject() : employee;
  return { ...employeeObj, attendance: [] };
};

// Main Controllers
export const attendanceReport = async (req, res) => {
  try {
    const { employeeId, month, year, search } = req.query;
    const now = new Date();
    const queryMonth = month || String(now.getMonth() + 1);
    const queryYear = year || String(now.getFullYear());

    // Fetch holidays once
    const holidays = await Holiday.find().lean();
    const holidayMap = getHolidayMap(holidays);
    const days = getMonthDays(queryYear, queryMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let employeeData;
    
    if (employeeId) {
      employeeData = await fetchEmployeeData({ _id: employeeId });
      if (!employeeData) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
    } else if (search) {
      employeeData = await fetchEmployeeData({ name: { $regex: search, $options: 'i' } });
      if (!employeeData) {
        return res.json({ success: true, data: null });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Employee ID or search required' });
    }

    // Fetch and process attendance
    const { docs: attendances } = await attendanceService.getMonthlyAttendances(
      employeeData._id,
      queryYear,
      queryMonth,
      { page: 1, limit: 1000 }
    );

    const todayForClamp = new Date();
    todayForClamp.setHours(0, 0, 0, 0);

    const processedAttendances = await Promise.all(
      attendances.map(att => computeAttendanceData(att, employeeData, todayForClamp))
    );

    const attMap = {};
    processedAttendances.forEach(att => {
      if (att?.date) {
        const dateStr = att.date instanceof Date 
          ? att.date.toISOString().slice(0, 10)
          : String(att.date).slice(0, 10);
        if (dateStr) attMap[dateStr] = att;
      }
    });

    employeeData.attendance = processedAttendances;

    // Build table rows
    const table = await buildAttendanceRows(days, attMap, holidayMap, employeeData, today);

    // Update and fetch summary
    await updateMonthlySummary(employeeData._id, queryYear, queryMonth, processedAttendances, days);
    
    const summary = await MonthlySummary.findOne({
      employee: employeeData._id,
      year: parseInt(queryYear),
      month: parseInt(queryMonth)
    });

    return res.json({
      success: true,
      data: { employee: employeeData, days, table, summary, holidays }
    });

  } catch (err) {
    console.error('Attendance report error', err);
    const e = handleMongooseError(err);
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message));
  }
};

export const todaysAttendance = async (req, res) => {
  try {
    const now = req.query.now ? new Date(req.query.now) : new Date();
    const attendanceIso = await attendanceService.getAttendanceIsoForTimestamp(now);
    const start = new Date(`${attendanceIso}T00:00:00Z`);
    const end = new Date(`${attendanceIso}T23:59:59Z`);

    const attendances = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).lean();

    const attendanceMap = {};
    attendances.forEach(att => {
      if (!att) return;
      const empId = att.employee?.toString() || att.employee;
      attendanceMap[empId] = att;
    });

    return res.json({
      success: true,
      data: { attendanceIso, attendances, map: attendanceMap }
    });
  } catch (err) {
    console.error('todaysAttendance error', err);
    const e = handleMongooseError(err);
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message));
  }
};

// Punch Handlers
const handlePunch = {
  in: async (emp, now, currentTimeString, attendanceIso, existingAttendance = null) => {
    if (emp.status?.toString().toLowerCase() !== 'active') {
      throw new Error('Employee is inactive');
    }

    if (existingAttendance) {
      // Ensure holiday flag is accurate for this attendance date
      try {
        const dIso = existingAttendance.date ? new Date(existingAttendance.date).toISOString().slice(0,10) : null;
        if (dIso) {
          const _start = new Date(`${dIso}T00:00:00Z`);
          const _end = new Date(`${dIso}T23:59:59Z`);
          const _h = await Holiday.findOne({ date: { $gte: _start, $lte: _end } }).lean();
          existingAttendance.isHoliday = !!_h;
        }
      } catch (e) {}

      existingAttendance.punchLogs.push({ punchType: 'IN', punchTime: now });
      existingAttendance.inTime = currentTimeString;
      await updateAttendanceTotals(existingAttendance, emp);
      await existingAttendance.save();
      
      attendanceService.recordPunch(emp._id.toString(), 'IN');
      await updateMonthlySummaryForEmployee(emp._id);
      
      await attendanceService.handleContinuousINAcross8AM(emp._id, attendanceIso, Attendance);
      
      const summary = await getCurrentMonthSummary(emp._id);
      emitAttendanceUpdate(emp, existingAttendance, 'in', summary);
      
      salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(console.error);
      
      return {
        type: 'in',
        message: 'Punch IN appended to existing attendance',
        attendance: existingAttendance
      };
    }

    const dateIso = attendanceIso || new Date().toISOString().slice(0, 10);
    const dateObj = new Date(`${dateIso}T00:00:00Z`);
    const dayOfWeek = dateObj.getDay();
    
    let isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    try {
      const rule = await getSalaryRuleForSubDepartment(emp.subDepartment?._id || emp.subDepartment);
      const workingDaysPerWeek = rule?.workingDaysPerWeek || 6;
      if (workingDaysPerWeek === 6) isWeekend = dayOfWeek === 0;
      if (workingDaysPerWeek === 5) isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    } catch (e) {
      // Use default
    }

    // Determine if this date is a holiday
    let newIsHoliday = false;
    try {
      const dIso = dateObj.toISOString().slice(0,10);
      const _start = new Date(`${dIso}T00:00:00Z`);
      const _end = new Date(`${dIso}T23:59:59Z`);
      const _h = await Holiday.findOne({ date: { $gte: _start, $lte: _end } }).lean();
      newIsHoliday = !!_h;
    } catch (e) {}

    const newAttendance = await Attendance.create({
      employee: emp._id,
      date: dateObj,
      status: 'present',
      inTime: currentTimeString,
      outTime: null,
      totalHours: 0,
      totalMinutes: 0,
      totalHoursDisplay: '0h 0m',
      regularHoursDisplay: '0h 0m',
      overtimeHoursDisplay: '0h 0m',
      regularHours: 0,
      overtimeHours: 0,
      dayOtHours: 0,
      breakMinutes: 0,
      isWeekend,
      isHoliday: newIsHoliday,
      punchLogs: [{ punchType: 'IN', punchTime: now }],
      note: 'Punch IN via barcode scanner'
    });

    attendanceService.recordPunch(emp._id.toString(), 'IN');
    await updateMonthlySummaryForEmployee(emp._id);
    await attendanceService.handleContinuousINAcross8AM(emp._id, dateIso, Attendance);
    
    const summary = await getCurrentMonthSummary(emp._id);
    emitAttendanceUpdate(emp, newAttendance, 'in', summary);
    
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(console.error);

    return {
      type: 'in',
      message: 'Punch IN successful',
      attendance: newAttendance
    };
  },

  out: async (emp, attendance, now, currentTimeString) => {
    if (emp.status?.toString().toLowerCase() !== 'active') {
      throw new Error('Employee is inactive');
    }

    // Ensure holiday flag is accurate before computing totals
    try {
      const dIso = attendance.date ? new Date(attendance.date).toISOString().slice(0,10) : null;
      if (dIso) {
        const _start = new Date(`${dIso}T00:00:00Z`);
        const _end = new Date(`${dIso}T23:59:59Z`);
        const _h = await Holiday.findOne({ date: { $gte: _start, $lte: _end } }).lean();
        attendance.isHoliday = !!_h;
      }
    } catch (e) {}

    attendance.punchLogs.push({ punchType: 'OUT', punchTime: now });
    await updateAttendanceTotals(attendance, emp);
    
    attendance.outTime = currentTimeString;
    attendance.note = `Punch OUT via barcode scanner | Total: ${attendance.totalHoursDisplay} | Regular: ${attendance.regularHoursDisplay} | OT: ${attendance.overtimeHoursDisplay}`;
    
    await attendance.save();
    attendanceService.recordPunch(emp._id.toString(), 'OUT');
    
    await updateMonthlySummaryForEmployee(emp._id);
    const summary = await getCurrentMonthSummary(emp._id);
    emitAttendanceUpdate(emp, attendance, 'out', summary);
    
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(console.error);

    return {
      type: 'out',
      message: 'Punch OUT successful',
      attendance,
      total_hours: attendance.totalHours,
      regular_hours: attendance.regularHours,
      overtime_hours: attendance.overtimeHours
    };
  }
};

async function updateAttendanceTotals(attendance, emp) {
  const shiftCfg = await attendanceService.getShiftConfig();
  let shiftHours = 8;

  if (emp.shift) {
    const match = String(emp.shift).match(/(\d+(?:\.\d+)?)/);
    if (match) shiftHours = Math.max(Number(match[1]) || shiftHours, shiftHours);
  }

  shiftHours = shiftCfg.shiftHours > 0 ? shiftCfg.shiftHours : shiftHours;

  const computed = attendanceService.computeTotalsFromPunchLogs(
    attendance.punchLogs,
    shiftHours,
    {
      countOpenAsNow: true,
      dayMeta: { isWeekend: attendance.isWeekend, isHoliday: attendance.isHoliday }
    }
  );

  attendance.totalHours = computed.totalHours;
  attendance.regularHours = computed.regularHours;
  attendance.overtimeHours = computed.overtimeHours;
  attendance.totalMinutes = computed.totalMinutes;
  attendance.totalHoursDisplay = computed.totalHoursDisplay;
  attendance.regularHoursDisplay = computed.regularHoursDisplay;
  attendance.overtimeHoursDisplay = computed.overtimeHoursDisplay;
  attendance.dayOtHours = computed.dayOtHours;
  attendance.nightOtHours = computed.nightOtHours;
  attendance.sundayOtHours = computed.sundayOtHours;
  attendance.festivalOtHours = computed.festivalOtHours;

  if (computed.lastInTime) {
    attendance.inTime = new Date(computed.lastInTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

async function updateMonthlySummaryForEmployee(employeeId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const attendances = await Attendance.find({
    employee: employeeId,
    date: {
      $gte: new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`),
      $lt: new Date(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)
    }
  }).lean();

  const days = getMonthDays(year, month);
  await updateMonthlySummary(employeeId, year, month, attendances, days);
}

async function getCurrentMonthSummary(employeeId) {
  const now = new Date();
  return MonthlySummary.findOne({
    employee: employeeId,
    year: now.getFullYear(),
    month: now.getMonth() + 1
  });
}

function emitAttendanceUpdate(emp, attendance, type, summary) {
  try {
    const io = getIO();
    if (io) {
      io.emit('attendance:updated', {
        employee: emp._id.toString(),
        attendance,
        type,
        summary
      });
    }
  } catch (e) {
    console.warn('Socket emit failed', e.message);
  }
}

export const scanAttendance = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Barcode code is required' });
    }

    const emp = await Employee.findOne({ empId: code })
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation');

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found with this code' });
    }

    // Determine timestamp
    let now = new Date();
    const clientTsRaw = req.body?.clientTs || req.body?.punchTime || req.query?.ts;
    if (clientTsRaw) {
      const asNumber = Number(clientTsRaw);
      now = !Number.isNaN(asNumber) ? new Date(asNumber) : new Date(clientTsRaw);
      if (isNaN(now.getTime())) now = new Date();
    }

    // Get time string
    const tzOffsetMinutes = Number(req.body?.tzOffsetMinutes);
    let currentTimeString;
    
    if (!Number.isNaN(tzOffsetMinutes)) {
      const clientLocal = new Date(now.getTime() - (tzOffsetMinutes * 60000));
      currentTimeString = clientLocal.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      currentTimeString = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    // Check duplicate
    if (attendanceService.isPunchDuplicate(emp._id.toString(), null)) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate punch detected. Please try again after a few seconds.'
      });
    }

    // Get attendance date
    const attendanceIso = await attendanceService.getAttendanceIsoForTimestamp(now);
    const attendanceDoc = await Attendance.findOne({
      employee: emp._id,
      date: {
        $gte: new Date(`${attendanceIso}T00:00:00Z`),
        $lte: new Date(`${attendanceIso}T23:59:59Z`)
      }
    });

    let result;
    if (attendanceDoc) {
      const lastPunch = attendanceDoc.punchLogs?.slice(-1)[0]?.punchType?.toUpperCase();
      if (lastPunch === 'IN') {
        result = await handlePunch.out(emp, attendanceDoc, now, currentTimeString);
      } else {
        result = await handlePunch.in(emp, now, currentTimeString, attendanceIso, attendanceDoc);
      }
    } else {
      result = await handlePunch.in(emp, now, currentTimeString, attendanceIso);
    }

    // Populate employee for response
    await emp.populate('reportsTo', 'name empId');

    return res.json({
      success: true,
      ...result,
      employee_id: emp._id,
      time: currentTimeString,
      employee_name: emp.name
    });

  } catch (err) {
    console.error('Barcode attendance error:', err);
    const e = handleMongooseError(err);
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message));
  }
};

// Monthly Summary Helper
export async function updateMonthlySummary(employeeId, year, month, attendances, days, empJoiningDate) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counts = {
      totalPresent: 0,
      totalAbsent: 0,
      totalHalfday: 0,
      totalLeave: 0,
      totalWorkingDays: 0,
      totalHoursWorked: 0,
      totalOvertimeHours: 0
    };

    // Build attendance map
    const attMap = {};
    attendances.forEach(att => {
      if (!att?.date) return;
      const dateStr = att.date instanceof Date 
        ? att.date.toISOString().slice(0, 10)
        : String(att.date).slice(0, 10);
      if (dateStr) attMap[dateStr] = att;
    });

    // Get working days per week
    let workingDaysPerWeek = 6;
    try {
      const emp = await Employee.findById(employeeId).lean();
      const rule = emp?.subDepartment 
        ? await getSalaryRuleForSubDepartment(emp.subDepartment._id || emp.subDepartment)
        : null;
      workingDaysPerWeek = rule?.workingDaysPerWeek || 6;
    } catch (e) {
      // Use default
    }

    // Process each day
    days.forEach(day => {
      const dayDate = new Date(day.iso);
      dayDate.setHours(0, 0, 0, 0);
      
      const pastDate = dayDate < today;
      const afterJoining = !empJoiningDate || dayDate >= empJoiningDate;
      const weekend = isWeekend(dayDate, workingDaysPerWeek);

      if (!weekend && afterJoining) {
        counts.totalWorkingDays++;

        const rec = attMap[day.iso];
        if (rec) {
          const status = rec.status || 'present';
          switch (status) {
            case 'present':
              counts.totalPresent++;
              counts.totalHoursWorked += rec.totalHours || 0;
              counts.totalOvertimeHours += rec.overtimeHours || 0;
              break;
            case 'absent':
              counts.totalAbsent++;
              break;
            case 'halfday':
              counts.totalHalfday++;
              counts.totalHoursWorked += rec.totalHours || 0;
              break;
            case 'leave':
              counts.totalLeave++;
              break;
          }
        } else if (pastDate) {
          counts.totalAbsent++;
        }
      }
    });

    // Update or create summary
    await MonthlySummary.findOneAndUpdate(
      { employee: employeeId, year: parseInt(year), month: parseInt(month) },
      {
        ...counts,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Error updating monthly summary:', err);
  }
}