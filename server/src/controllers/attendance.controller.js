import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
import { getIO } from "../utils/socket.util.js";

// Helper: determine attendance day ISO (YYYY-MM-DD) based on 8AM boundary
// Uses timezone-aware calculation (default: Asia/Kolkata) so that
// the attendance day matches local date when punch was made.
const getAttendanceIsoForTimestamp = (ts) => {
  const timeZone = process.env.ATTENDANCE_TIMEZONE || 'Asia/Kolkata';
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(new Date(ts)).reduce((acc, p) => {
    if (p.type === 'year') acc.year = Number(p.value);
    if (p.type === 'month') acc.month = Number(p.value);
    if (p.type === 'day') acc.day = Number(p.value);
    if (p.type === 'hour') acc.hour = Number(p.value);
    return acc;
  }, { year: 0, month: 0, day: 0, hour: 0 });

  const { year, month, day, hour } = parts;
  let baseYear = year;
  let baseMonth = month;
  let baseDay = day;
  if (hour < 8) {
    const dt = new Date(Date.UTC(year, month - 1, day));
    dt.setUTCDate(dt.getUTCDate() - 1);
    baseYear = dt.getUTCFullYear();
    baseMonth = dt.getUTCMonth() + 1;
    baseDay = dt.getUTCDate();
  }
  const mm = String(baseMonth).padStart(2, '0');
  const dd = String(baseDay).padStart(2, '0');
  return `${baseYear}-${mm}-${dd}`;
}

const monthDays = (year, month) => {
  // month: 1-12
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  const arr = [];
  for (let d = 1; d <= daysInMonth; d++) {
    // Build iso directly from y,m,d to avoid timezone shifts from toISOString
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const iso = `${y}-${mm}-${dd}`; // YYYY-MM-DD
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    arr.push({ date: String(d).padStart(2, '0'), iso, day: dayName });
  }
  return arr;
};

export const attendanceReport = async (req, res) => {
  try {
    const { employeeId, month, year, search } = req.query;
    // default month/year to current if not provided
    const now = new Date();
    const queryMonth = month || String(now.getMonth() + 1); 
    const queryYear = year || String(now.getFullYear());

    if (employeeId) {
      const emp = await Employee.findById(employeeId)
        .populate('headDepartment')
        .populate('subDepartment')
        // .populate('group')
        .populate('designation')
        // .populate('reportsTo', 'name empId');
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

      const days = monthDays(queryYear, queryMonth);

      // Query attendance records for the employee for the current month range
      const startDate = new Date(`${queryYear}-${String(queryMonth).padStart(2, '0')}-01T00:00:00Z`); 
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setSeconds(endDate.getSeconds() - 1);

        const { docs: atts } = await attendanceService.getMonthlyAttendances(emp._id, queryYear, queryMonth, { page: 1, limit: 1000 });

        // Ensure each attendance doc has computed totals and last in/out based on punchLogs
        for (let i = 0; i < atts.length; i++) {
          const a = atts[i];
          if (a && Array.isArray(a.punchLogs) && a.punchLogs.length > 0) {
            const computed = attendanceService.computeTotalsFromPunchLogs(a.punchLogs, 8);
            a.totalHours = computed.totalHours;
            a.regularHours = computed.regularHours;
            a.overtimeHours = computed.overtimeHours;
            a.totalMinutes = computed.totalMinutes;
            a.totalHoursDisplay = computed.totalHoursDisplay;
            a.regularHoursDisplay = computed.regularHoursDisplay;
            a.overtimeHoursDisplay = computed.overtimeHoursDisplay;
            a.inTime = computed.lastInTime ? new Date(computed.lastInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : a.inTime;
            a.outTime = computed.lastOutTime ? new Date(computed.lastOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : a.outTime;
            a._computedPairs = computed.pairs;
          }
        }

      // Auto-mark absent for past dates (after joining date) if not already marked
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const d of days) {
        const dayDate = new Date(d.iso);
        dayDate.setHours(0, 0, 0, 0);

        if (dayDate < today) {
          const iso = d.iso;
          const alreadyMarked = atts.some(a => {
            const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null;
            return aDate === iso;
          });

          if (!alreadyMarked) {
            const dayOfWeek = dayDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            if (!isWeekend) {
              const empJoiningDate = emp.createdAt ? new Date(emp.createdAt) : null;
              empJoiningDate?.setHours(0, 0, 0, 0);
              if (!empJoiningDate || dayDate >= empJoiningDate) {
                // create absent attendance
                const absentDoc = await Attendance.create({
                  employee: emp._id,
                  date: dayDate,
                  status: 'absent',
                  inTime: null,
                  outTime: null,
                  totalHours: 0,
                  regularHours: 0,
                  overtimeHours: 0,
                  breakMinutes: 0,
                  isWeekend: false,
                  isHoliday: false,
                  punchLogs: [],
                  note: 'Auto-marked absent (no attendance record)'
                });
                atts.push(absentDoc);
              }
            }
          }
        }
      }

      // build data rows: Status, InTime, OutTime, Worked Hours, OT (Hours), Note
      const statusRow = [];
      const inRow = [];
      const outRow = [];
      const workedRow = [];
      const otRow = [];
      const noteRow = [];

      for (const d of days) {
        const rec = atts.find(a => { 
          const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null;
          return aDate === d.iso;
        });
        if (rec) {
          statusRow.push(rec.status || 'present');
          inRow.push(rec.inTime || '');
          outRow.push(rec.outTime || '');
          // Prefer human-friendly display when available
          workedRow.push(rec.totalHoursDisplay || (typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : ''));
          otRow.push(rec.overtimeHoursDisplay || (typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : ''));
          noteRow.push(rec.note || '');
        } else {
          statusRow.push(null);
          inRow.push(null);
          outRow.push(null);
          workedRow.push(null);
          otRow.push(null);
          noteRow.push(null);
        }
      }

      const table = { Status: statusRow, In: inRow, Out: outRow, 'Worked Hours': workedRow, 'OT (Hours)': otRow, Note: noteRow };

      const employeeObj = emp.toObject ? emp.toObject() : emp;
      employeeObj.attendance = atts;

      return res.json({ success: true, data: { employee: employeeObj, days, table } }); 
    }

    // if no employeeId: support search to return first matched employee report
    const q = {};
    if (search) q.name = { $regex: search, $options: 'i' };
    const emp = await Employee.findOne(q)
      .populate('headDepartment')
      .populate('subDepartment')
      // .populate('group')
      .populate('designation')
      // .populate('reportsTo', 'name empId');
    if (!emp) return res.json({ success: true, data: null });

    const days = monthDays(queryYear, queryMonth);

    // Query attendance records for this employee for the month
    const startDate = new Date(`${queryYear}-${String(queryMonth).padStart(2, '0')}-01T00:00:00Z`); 
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setSeconds(endDate.getSeconds() - 1);

    const { docs: atts } = await attendanceService.getMonthlyAttendances(emp._id, queryYear, queryMonth, { page: 1, limit: 1000 });
    // Ensure each attendance doc has computed totals and last in/out based on punchLogs
    for (let i = 0; i < atts.length; i++) {
      const a = atts[i];
      if (a && Array.isArray(a.punchLogs) && a.punchLogs.length > 0) {
        const computed = attendanceService.computeTotalsFromPunchLogs(a.punchLogs, emp.workHours || 8);
        a.totalHours = computed.totalHours;
        a.regularHours = computed.regularHours;
        a.overtimeHours = computed.overtimeHours;
        a.totalMinutes = computed.totalMinutes;
        a.totalHoursDisplay = computed.totalHoursDisplay;
        a.regularHoursDisplay = computed.regularHoursDisplay;
        a.overtimeHoursDisplay = computed.overtimeHoursDisplay;
        a.inTime = computed.lastInTime ? new Date(computed.lastInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : a.inTime;
        a.outTime = computed.lastOutTime ? new Date(computed.lastOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : a.outTime;
        a._computedPairs = computed.pairs;
      }
    }

    // Auto-mark absent for past dates (after joining date) if not already marked
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const d of days) {
      const dayDate = new Date(d.iso);
      dayDate.setHours(0, 0, 0, 0);

      if (dayDate < today) {
        const iso = d.iso;
        const alreadyMarked = atts.some(a => {
          const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null;
          return aDate === iso;
        });

        if (!alreadyMarked) {
          const dayOfWeek = dayDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          if (!isWeekend) {
            const empJoiningDate = emp.createdAt ? new Date(emp.createdAt) : null;
            empJoiningDate?.setHours(0, 0, 0, 0);
            if (!empJoiningDate || dayDate >= empJoiningDate) {
              const absentDoc = await Attendance.create({
                employee: emp._id,
                date: dayDate,
                status: 'absent',
                inTime: null,
                outTime: null,
                totalHours: 0,
                regularHours: 0,
                overtimeHours: 0,
                breakMinutes: 0,
                isWeekend: false,
                isHoliday: false,
                punchLogs: [],
                note: 'Auto-marked absent (no attendance record)'
              });
              atts.push(absentDoc);
            }
          }
        }
      }
    }

    const statusRow = [];
    const inRow = [];
    const outRow = [];
    const workedRow = [];
    const otRow = [];
    const noteRow = [];

    for (const d of days) {
      const rec = atts.find(a => {
        const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null;
        return aDate === d.iso;
      });
      if (rec) {
        statusRow.push(rec.status || 'present');
        inRow.push(rec.inTime || '');
        outRow.push(rec.outTime || '');
        workedRow.push(rec.totalHoursDisplay || (typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : ''));
        otRow.push(rec.overtimeHoursDisplay || (typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : ''));
        noteRow.push(rec.note || '');
      } else {
        statusRow.push(null);
        inRow.push(null);
        outRow.push(null);
        workedRow.push(null);
        otRow.push(null);
        noteRow.push(null);
      }
    }
    const table = { Status: statusRow, In: inRow, Out: outRow, 'Worked Hours': workedRow, 'OT (Hours)': otRow, Note: noteRow };
    const employeeObj = emp.toObject ? emp.toObject() : emp;
    employeeObj.attendance = atts;
    return res.json({ success: true, data: { employee: employeeObj, days, table } });
  } catch (err) {
    console.error('Attendance report error', err);
    const e = handleMongooseError(err);
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message));
  }
};

// Return all attendance records for the current attendance-day (8:00 AM boundary)
export const todaysAttendance = async (req, res) => {
  try {
    // allow overriding time via query (ISO or timestamp) for testing
    const now = req.query.now ? new Date(req.query.now) : new Date();
    // Determine attendance date based on 8AM boundary
    const attendanceIso = getAttendanceIsoForTimestamp(now);
    const start = new Date(`${attendanceIso}T00:00:00Z`);
    const end = new Date(`${attendanceIso}T23:59:59Z`);

    const atts = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).lean();

    // Build map employeeId -> attendance
    const map = {};
    for (const a of atts) {
      if (!a) continue;
      const empId = (a.employee && a.employee.toString) ? a.employee.toString() : a.employee;
      map[empId] = a;
    }

    return res.json({ success: true, data: { attendanceIso, attendances: atts, map } });
  } catch (err) {
    console.error('todaysAttendance error', err);
    const e = handleMongooseError(err);
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message));
  }
}
// Mark attendance via barcode scanner (matches Laravel 72-hour rule)
export const scanAttendance = async (req, res) => {
  try {
    const { code } = req.query;
    const { date } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Barcode code is required' });
    }

    // Find employee by empId (barcode code typically contains empId)
    const emp = await Employee.findOne({ empId: code })
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation')
      .populate('reportsTo', 'name empId');

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found with this code' });
    }

    const now = new Date();
    const currentTimeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Check for duplicate punch (debounce)
    if (attendanceService.isPunchDuplicate(emp._id.toString(), null)) {
      return res.status(400).json({ success: false, message: 'Duplicate punch detected. Please try again after a few seconds.' });
    }

    // Determine attendance date based on 8AM boundary (timezone-aware helper above)
    const attendanceIso = getAttendanceIsoForTimestamp(now);
    const attendanceDoc = await Attendance.findOne({
      employee: emp._id,
      date: {
        $gte: new Date(`${attendanceIso}T00:00:00Z`),
        $lte: new Date(`${attendanceIso}T23:59:59Z`)
      }
    });

    // If attendance exists for the computed date, toggle based on last punch
    if (attendanceDoc) {
      // find last punch type
      let lastPunchType = null;
      if (Array.isArray(attendanceDoc.punchLogs) && attendanceDoc.punchLogs.length > 0) {
        lastPunchType = (attendanceDoc.punchLogs[attendanceDoc.punchLogs.length - 1].punchType || '').toUpperCase();
      }
      if (lastPunchType === 'IN') {
        // mark OUT
        return handlePunchOut(emp, attendanceDoc, now, currentTimeString, res);
      } else {
        // mark IN (append to existing doc)
        return handlePunchIn(emp, now, currentTimeString, res, attendanceIso, attendanceDoc);
      }
    }

    // No attendance doc => create new and mark IN
    return handlePunchIn(emp, now, currentTimeString, res, attendanceIso, null);

  } catch (err) {
    console.error('Barcode attendance error:', err);
    const e = handleMongooseError(err)
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message))
  }
};

// Handle Punch IN
async function handlePunchIn(emp, now, currentTimeString, res, attendanceIso = null, existingAttendance = null) {
  try {
    // If existingAttendance provided, append IN punch
    if (existingAttendance) {
      existingAttendance.punchLogs = existingAttendance.punchLogs || [];
      existingAttendance.punchLogs.push({ punchType: 'IN', punchTime: now });
      existingAttendance.inTime = currentTimeString;
      // Recompute totals (no OUT yet, totals will be zero or previous)
      const computed = attendanceService.computeTotalsFromPunchLogs(existingAttendance.punchLogs, 8);
      existingAttendance.totalHours = computed.totalHours;
      existingAttendance.regularHours = computed.regularHours;
      existingAttendance.overtimeHours = computed.overtimeHours;
      existingAttendance.totalMinutes = computed.totalMinutes;
      existingAttendance.totalHoursDisplay = computed.totalHoursDisplay;
      existingAttendance.regularHoursDisplay = computed.regularHoursDisplay;
      existingAttendance.overtimeHoursDisplay = computed.overtimeHoursDisplay;
      await existingAttendance.save();
      
      // Record punch in debounce cache
      attendanceService.recordPunch(emp._id.toString(), 'IN');
      
      // Check for continuous IN across 8AM boundary
      await attendanceService.handleContinuousINAcross8AM(emp._id, attendanceIso, Attendance);

      await emp.populate('headDepartment');
      await emp.populate('subDepartment');
      await emp.populate('designation');
      await emp.populate('reportsTo', 'name empId');

      // emit socket update
      try {
        const io = getIO();
        if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: existingAttendance, type: 'in' });
      } catch (e) {
        console.warn('Socket emit failed', e.message || e);
      }

      return res.status(200).json({
        success: true,
        type: 'in',
        message: 'Punch IN appended to existing attendance',
        attendance: existingAttendance,
        employee_id: emp._id,
        time: currentTimeString,
        employee_name: emp.name
      });
    }

    // create new attendance for attendanceIso (or today fallback)
    const dateIso = attendanceIso || new Date().toISOString().slice(0,10);
    const dateObj = new Date(`${dateIso}T00:00:00Z`);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const newAttendanceDoc = await Attendance.create({
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
      breakMinutes: 0,
      isWeekend,
      isHoliday: false,
      punchLogs: [ { punchType: 'IN', punchTime: now } ],
      note: 'Punch IN via barcode scanner'
    });
    
    // Record punch in debounce cache
    attendanceService.recordPunch(emp._id.toString(), 'IN');
    
    // Check for continuous IN across 8AM boundary
    await attendanceService.handleContinuousINAcross8AM(emp._id, dateIso, Attendance);

    // Re-populate employee relations for response
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('designation');
    await emp.populate('reportsTo', 'name empId');

    // emit socket update for new attendance
    try {
      const io = getIO();
      if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: newAttendanceDoc, type: 'in' });
    } catch (e) {
      console.warn('Socket emit failed', e.message || e);
    }

    return res.status(201).json({
      success: true,
      type: 'in',
      message: 'Punch IN successful',
      attendance: newAttendanceDoc,
      employee_id: emp._id,
      time: currentTimeString,
      employee_name: emp.name
    });
  } catch (err) {
    console.error('Punch IN error:', err);
    const e = handleMongooseError(err)
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message))
  }
}

// Handle Punch OUT
async function handlePunchOut(emp, attendanceDoc, now, currentTimeString, res) {
  try {
    const attendance = attendanceDoc;

    // Append OUT punch and recompute totals/pairs from punchLogs
    attendance.punchLogs = attendance.punchLogs || [];
    attendance.punchLogs.push({ punchType: 'OUT', punchTime: now });

    const computed = attendanceService.computeTotalsFromPunchLogs(attendance.punchLogs, 8);
    const totalHours = computed.totalHours;
    const regularHours = computed.regularHours;
    const overtimeHours = computed.overtimeHours;

    attendance.totalHours = totalHours;
    attendance.regularHours = regularHours;
    attendance.overtimeHours = overtimeHours;
    attendance.totalMinutes = computed.totalMinutes;
    attendance.totalHoursDisplay = computed.totalHoursDisplay;
    attendance.regularHoursDisplay = computed.regularHoursDisplay;
    attendance.overtimeHoursDisplay = computed.overtimeHoursDisplay;
    attendance.inTime = computed.lastInTime ? new Date(computed.lastInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendance.inTime;
    attendance.outTime = computed.lastOutTime ? new Date(computed.lastOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendance.outTime;
    attendance.note = `Punch OUT via barcode scanner | Total: ${computed.totalHoursDisplay} | Regular: ${computed.regularHoursDisplay} | OT: ${computed.overtimeHoursDisplay}`;

    await attendance.save();
    
    // Record punch in debounce cache
    attendanceService.recordPunch(emp._id.toString(), 'OUT');

    // Re-populate employee relations for response
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('designation');
    await emp.populate('reportsTo', 'name empId');

    // emit socket update for out
    try {
      const io = getIO();
      if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance, type: 'out' });
    } catch (e) {
      console.warn('Socket emit failed', e.message || e);
    }

    return res.status(200).json({
      success: true,
      type: 'out',
      message: 'Punch OUT successful',
      attendance,
      employee_id: emp._id,
      time: currentTimeString,
      employee_name: emp.name,
      total_hours: totalHours,
      regular_hours: regularHours,
      overtime_hours: overtimeHours
    });
  } catch (err) {
    console.error('Punch OUT error:', err);
    const e = handleMongooseError(err)
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message))
  }
}