import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import MonthlySummary from "../models/monthlySummary.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
import { getIO } from "../utils/socket.util.js";
import salaryRecalcService from "../services/salaryRecalculation.service.js";

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
            const shiftCfg = await attendanceService.getShiftConfig();
            const shiftHours = emp.workHours || emp.shift || shiftCfg.shiftHours || 8;
            const computed = attendanceService.computeTotalsFromPunchLogs(
              a.punchLogs,
              shiftHours,
              { countOpenAsNow: true }
            );
            a.totalHours = computed.totalHours;
            a.regularHours = computed.regularHours;
            a.overtimeHours = computed.overtimeHours;
            a.totalMinutes = computed.totalMinutes;
            a.totalHoursDisplay = computed.totalHoursDisplay;
            a.regularHoursDisplay = computed.regularHoursDisplay;
            a.overtimeHoursDisplay = computed.overtimeHoursDisplay;
            a._computedPairs = computed.pairs;
          }
        }

      // Check for unmarked past dates but DON'T create them here to avoid duplicates
      // Just represent them as absent in the UI without persisting
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const empJoiningDate = emp.createdAt ? new Date(emp.createdAt) : null;
      empJoiningDate?.setHours(0, 0, 0, 0);

      // Build attendance map for quick lookup
      const attMap = {};
      for (const a of atts) {
        const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null;
        if (aDate) attMap[aDate] = a;
      }

      // build data rows: Status, InTime, OutTime, Worked Hours, OT (Hours), Note
      const statusRow = [];
      const inRow = [];
      const outRow = [];
      const workedRow = [];
      const otRow = [];
      const noteRow = [];

      for (const d of days) {
        const rec = attMap[d.iso];
        const dayDate = new Date(d.iso);
        dayDate.setHours(0, 0, 0, 0);
        const dayOfWeek = dayDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isPastDate = dayDate < today;
        const isAfterJoining = !empJoiningDate || dayDate >= empJoiningDate;

        if (rec) {
          statusRow.push(rec.status || 'present');
          inRow.push(rec.inTime || '');
          outRow.push(rec.outTime || '');
          workedRow.push(rec.totalHoursDisplay || (typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : ''));
          otRow.push(rec.overtimeHoursDisplay || (typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : ''));
          noteRow.push(rec.note || '');
        } else if (isPastDate && !isWeekend && isAfterJoining) {
          // Show as absent for past non-weekend dates without creating DB record
          statusRow.push('absent');
          inRow.push('');
          outRow.push('');
          workedRow.push('');
          otRow.push('');
          noteRow.push('Not marked');
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

      // Calculate and cache monthly summary for fast rendering
      await updateMonthlySummary(emp._id, queryYear, queryMonth, atts, days, empJoiningDate);

      // Fetch and attach summary to response
      const summary = await MonthlySummary.findOne({ 
        employee: emp._id, 
        year: parseInt(queryYear), 
        month: parseInt(queryMonth) 
      });

      return res.json({ success: true, data: { employee: employeeObj, days, table, summary } }); 
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
        const shiftCfg = await attendanceService.getShiftConfig();
        const shiftHours = emp.workHours || emp.shift || shiftCfg.shiftHours || 8;
        const computed = attendanceService.computeTotalsFromPunchLogs(
          a.punchLogs,
          shiftHours,
          { countOpenAsNow: true }
        );
        a.totalHours = computed.totalHours;
        a.regularHours = computed.regularHours;
        a.overtimeHours = computed.overtimeHours;
        a.totalMinutes = computed.totalMinutes;
        a.totalHoursDisplay = computed.totalHoursDisplay;
        a.regularHoursDisplay = computed.regularHoursDisplay;
        a.overtimeHoursDisplay = computed.overtimeHoursDisplay;
        a._computedPairs = computed.pairs;
      }
    }

    // Build attendance map for quick lookup without creating absent records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const empJoiningDate = emp.createdAt ? new Date(emp.createdAt) : null;
    empJoiningDate?.setHours(0, 0, 0, 0);

    const attMap = {};
    for (const a of atts) {
      const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null;
      if (aDate) attMap[aDate] = a;
    }

    const statusRow = [];
    const inRow = [];
    const outRow = [];
    const workedRow = [];
    const otRow = [];
    const noteRow = [];

    for (const d of days) {
      const rec = attMap[d.iso];
      const dayDate = new Date(d.iso);
      dayDate.setHours(0, 0, 0, 0);
      const dayOfWeek = dayDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPastDate = dayDate < today;
      const isAfterJoining = !empJoiningDate || dayDate >= empJoiningDate;

      if (rec) {
        statusRow.push(rec.status || 'present');
        inRow.push(rec.inTime || '');
        outRow.push(rec.outTime || '');
        workedRow.push(rec.totalHoursDisplay || (typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : ''));
        otRow.push(rec.overtimeHoursDisplay || (typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : ''));
        noteRow.push(rec.note || '');
      } else if (isPastDate && !isWeekend && isAfterJoining) {
        statusRow.push('absent');
        inRow.push('');
        outRow.push('');
        workedRow.push('');
        otRow.push('');
        noteRow.push('Not marked');
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

    // Calculate and cache monthly summary
    await updateMonthlySummary(emp._id, queryYear, queryMonth, atts, days, empJoiningDate);

    // Fetch and attach summary to response
    const summary = await MonthlySummary.findOne({ 
      employee: emp._id, 
      year: parseInt(queryYear), 
      month: parseInt(queryMonth) 
    });

    return res.json({ success: true, data: { employee: employeeObj, days, table, summary } });
  } catch (err) {
    console.error('Attendance report error', err);
    const e = handleMongooseError(err);
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message));
  }
};

// Return all attendance records for the current attendance-day (07:00 AM boundary)
export const todaysAttendance = async (req, res) => {
  try {
    // allow overriding time via query (ISO or timestamp) for testing
    const now = req.query.now ? new Date(req.query.now) : new Date();
    // Determine attendance date based on configured boundary (default 07:00AM)
    const attendanceIso = await attendanceService.getAttendanceIsoForTimestamp(now);
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

    // Determine attendance date based on configured boundary (default 07:00) (timezone-aware helper above)
    const attendanceIso = await attendanceService.getAttendanceIsoForTimestamp(now);
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
      const shiftCfg_exist = await attendanceService.getShiftConfig();
      const shiftHours_exist = emp.workHours || emp.shift || shiftCfg_exist.shiftHours || 8;
      const computed = attendanceService.computeTotalsFromPunchLogs(existingAttendance.punchLogs, shiftHours_exist);
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
      
      // Check for continuous IN across configured boundary (e.g., 7AM)
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

      // Recalculate salary for current month
      salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
        console.error('Salary recalculation failed:', err)
      );

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
    
    // Check for continuous IN across configured boundary (e.g., 7AM)
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

    // Recalculate salary for current month
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
      console.error('Salary recalculation failed:', err)
    );

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

    const shiftCfg_out = await attendanceService.getShiftConfig();
    const shiftHours_out = emp.workHours || emp.shift || shiftCfg_out.shiftHours || 8;
    const computed = attendanceService.computeTotalsFromPunchLogs(attendance.punchLogs, shiftHours_out);
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

    // Recalculate salary for current month
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
      console.error('Salary recalculation failed:', err)
    );

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

// Helper function to calculate and store monthly summary
async function updateMonthlySummary(employeeId, year, month, attendances, days, empJoiningDate) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfday = 0;
    let totalLeave = 0;
    let totalWorkingDays = 0;
    let totalHoursWorked = 0;
    let totalOvertimeHours = 0;

    // Build attendance map
    const attMap = {};
    for (const a of attendances) {
      const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null;
      if (aDate) attMap[aDate] = a;
    }

    // Count status for each day
    for (const d of days) {
      const dayDate = new Date(d.iso);
      dayDate.setHours(0, 0, 0, 0);
      const dayOfWeek = dayDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPastDate = dayDate < today;
      const isAfterJoining = !empJoiningDate || dayDate >= empJoiningDate;

      // Only count working days (non-weekend, after joining)
      if (!isWeekend && isAfterJoining) {
        totalWorkingDays++;

        const rec = attMap[d.iso];
        if (rec) {
          const status = rec.status || 'present';
          if (status === 'present') {
            totalPresent++;
            totalHoursWorked += rec.totalHours || 0;
            totalOvertimeHours += rec.overtimeHours || 0;
          } else if (status === 'absent') {
            totalAbsent++;
          } else if (status === 'halfday') {
            totalHalfday++;
            totalHoursWorked += rec.totalHours || 0;
          } else if (status === 'leave') {
            totalLeave++;
          }
        } else if (isPastDate) {
          // Past date with no record = absent
          totalAbsent++;
        }
      }
    }

    // Update or create summary
    await MonthlySummary.findOneAndUpdate(
      { employee: employeeId, year: parseInt(year), month: parseInt(month) },
      {
        totalPresent,
        totalAbsent,
        totalHalfday,
        totalLeave,
        totalWorkingDays,
        totalHoursWorked,
        totalOvertimeHours,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Error updating monthly summary:', err);
  }
}