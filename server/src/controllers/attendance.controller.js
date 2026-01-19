import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import MonthlySummary from "../models/monthlySummary.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
import { getIO } from "../utils/socket.util.js";
import salaryRecalcService from "../services/salaryRecalculation.service.js";
import { getSalaryRuleForSubDepartment } from "../services/salary.service.js";

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
        .populate('headDepartment', 'name')
        .populate('subDepartment', 'name')
        .populate('designation', 'name')
        .lean();
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

      const days = monthDays(queryYear, queryMonth);

      // Query attendance records for the employee for the current month range
      const startDate = new Date(`${queryYear}-${String(queryMonth).padStart(2, '0')}-01T00:00:00Z`); 
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setSeconds(endDate.getSeconds() - 1);

        const { docs: atts } = await attendanceService.getMonthlyAttendances(emp._id, queryYear, queryMonth, { page: 1, limit: 1000 });

        // Normalize "today" once for clamping open IN punches on past days
        const todayForClamp = new Date();
        todayForClamp.setHours(0, 0, 0, 0);

        // Ensure each attendance doc has computed totals and last in/out based on punchLogs,
        // including OT buckets. For past days with an open IN, we clamp the
        // calculation at the end of that attendance day (next day at boundary hour)
        // instead of letting it grow until the current time.
        for (let i = 0; i < atts.length; i++) {
          const a = atts[i];
          if (a && Array.isArray(a.punchLogs) && a.punchLogs.length > 0) {
            const shiftCfg = await attendanceService.getShiftConfig();
            let shiftHours = 0;
            if (emp.shift) {
              const text = String(emp.shift);
              const match = text.match(/(\d+(?:\.\d+)?)/);
              if (match) {
                const parsed = Number(match[1]);
                if (!Number.isNaN(parsed) && parsed > 0) {
                  shiftHours = parsed;
                }
              }
            }
            if (!shiftHours && typeof shiftCfg.shiftHours === 'number' && shiftCfg.shiftHours > 0) {
              shiftHours = shiftCfg.shiftHours;
            }
            if (!shiftHours) shiftHours = 8;

            // Determine the reference "now" for this attendance: for past days,
            // cap at the end of that attendance day (next day at boundary hour)
            // so continuous IN does not keep increasing OT across days.
            const attendanceDate = a.date ? new Date(a.date) : null;
            let nowForThisAttendance = new Date();
            if (attendanceDate) {
              const dayStart = new Date(attendanceDate);
              dayStart.setHours(0, 0, 0, 0);
              if (dayStart < todayForClamp) {
                const boundaryHour = (typeof shiftCfg.boundaryHour === 'number' && shiftCfg.boundaryHour >= 0 && shiftCfg.boundaryHour <= 23)
                  ? shiftCfg.boundaryHour
                  : 7;
                const endOfAttendanceDay = new Date(dayStart);
                endOfAttendanceDay.setDate(endOfAttendanceDay.getDate() + 1);
                endOfAttendanceDay.setHours(boundaryHour, 0, 0, 0);
                nowForThisAttendance = endOfAttendanceDay;
              }
            }

            const computed = attendanceService.computeTotalsFromPunchLogs(
              a.punchLogs,
              shiftHours,
              { countOpenAsNow: true, now: nowForThisAttendance, dayMeta: { isWeekend: a.isWeekend, isHoliday: a.isHoliday } }
            );
            a.totalHours = computed.totalHours;
            a.regularHours = computed.regularHours;
            a.overtimeHours = computed.overtimeHours;
            a.totalMinutes = computed.totalMinutes;
            a.totalHoursDisplay = computed.totalHoursDisplay;
            a.regularHoursDisplay = computed.regularHoursDisplay;
            a.overtimeHoursDisplay = computed.overtimeHoursDisplay;
            a.dayOtHours = computed.dayOtHours;
            a.nightOtHours = computed.nightOtHours;
            a.sundayOtHours = computed.sundayOtHours;
            a.festivalOtHours = computed.festivalOtHours;
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

      // build data rows: Status, InTime, OutTime, Worked Hours, Regular Hours, OT (Hours), Note
      const statusRow = [];
      const inRow = [];
      const outRow = [];
      const workedRow = [];
      const regularRow = [];
      const otRow = [];
      const noteRow = [];

      // Fetch salary rule once for this employee to determine weekends
      const rule = await getSalaryRuleForSubDepartment(emp.subDepartment?._id || emp.subDepartment);
      const workingDaysPerWeek = rule?.workingDaysPerWeek || 6;

      for (const d of days) {
        const rec = attMap[d.iso];
        const dayDate = new Date(d.iso);
        dayDate.setHours(0, 0, 0, 0);
        const dayOfWeek = dayDate.getDay();
        let isWeekend;
        if (workingDaysPerWeek === 6) {
          isWeekend = dayOfWeek === 0; // Sunday only
        } else if (workingDaysPerWeek === 5) {
          isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sat + Sun
        } else {
          isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        }
        const isPastDate = dayDate < today;
        const isAfterJoining = !empJoiningDate || dayDate >= empJoiningDate;

        if (rec) {
          statusRow.push(rec.status || 'present');
          inRow.push(rec.inTime || '');
          outRow.push(rec.outTime || '');
          workedRow.push(rec.totalHoursDisplay || (typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : ''));
          regularRow.push(rec.regularHoursDisplay || (typeof rec.regularHours !== 'undefined' ? String(rec.regularHours) : ''));
          otRow.push(rec.overtimeHoursDisplay || (typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : ''));
          noteRow.push(rec.note || '');
        } else if (isPastDate && !isWeekend && isAfterJoining) {
          // Show as absent for past non-weekend dates without creating DB record
          statusRow.push('absent');
          inRow.push('');
          outRow.push('');
          workedRow.push('');
          regularRow.push('');
          otRow.push('');
          noteRow.push('Not marked');
        } else {
          statusRow.push(null);
          inRow.push(null);
          outRow.push(null);
          workedRow.push(null);
          regularRow.push(null);
          otRow.push(null);
          noteRow.push(null);
        }
      }

      const table = { Status: statusRow, In: inRow, Out: outRow, 'Worked Hours': workedRow, 'Regular Hours': regularRow, 'OT (Hours)': otRow, Note: noteRow };

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
      .populate('headDepartment', 'name')
      .populate('subDepartment', 'name')
      .populate('designation', 'name')
      .lean();
    if (!emp) return res.json({ success: true, data: null });

    const days = monthDays(queryYear, queryMonth);

    // Query attendance records for this employee for the month
    const startDate = new Date(`${queryYear}-${String(queryMonth).padStart(2, '0')}-01T00:00:00Z`); 
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setSeconds(endDate.getSeconds() - 1);

    const { docs: atts } = await attendanceService.getMonthlyAttendances(emp._id, queryYear, queryMonth, { page: 1, limit: 1000 });

    // Normalize today for clamping open IN on past days
    const todayForClamp = new Date();
    todayForClamp.setHours(0, 0, 0, 0);

    // Ensure each attendance doc has computed totals and last in/out based on punchLogs,
    // including OT buckets. Clamp open IN for past days at end-of-attendance-day.
    for (let i = 0; i < atts.length; i++) {
      const a = atts[i];
      if (a && Array.isArray(a.punchLogs) && a.punchLogs.length > 0) {
        const shiftCfg = await attendanceService.getShiftConfig();
        let shiftHours = 0;
        if (emp.shift) {
          const text = String(emp.shift);
          const match = text.match(/(\d+(?:\.\d+)?)/);
          if (match) {
            const parsed = Number(match[1]);
            if (!Number.isNaN(parsed) && parsed > 0) {
              shiftHours = parsed;
            }
          }
        }
        if (!shiftHours && typeof shiftCfg.shiftHours === 'number' && shiftCfg.shiftHours > 0) {
          shiftHours = shiftCfg.shiftHours;
        }
        if (!shiftHours) shiftHours = 8;

        const attendanceDate = a.date ? new Date(a.date) : null;
        let nowForThisAttendance = new Date();
        if (attendanceDate) {
          const dayStart = new Date(attendanceDate);
          dayStart.setHours(0, 0, 0, 0);
          if (dayStart < todayForClamp) {
            const boundaryHour = (typeof shiftCfg.boundaryHour === 'number' && shiftCfg.boundaryHour >= 0 && shiftCfg.boundaryHour <= 23)
              ? shiftCfg.boundaryHour
              : 7;
            const endOfAttendanceDay = new Date(dayStart);
            endOfAttendanceDay.setDate(endOfAttendanceDay.getDate() + 1);
            endOfAttendanceDay.setHours(boundaryHour, 0, 0, 0);
            nowForThisAttendance = endOfAttendanceDay;
          }
        }

        const computed = attendanceService.computeTotalsFromPunchLogs(
          a.punchLogs,
          shiftHours,
          { countOpenAsNow: true, now: nowForThisAttendance, dayMeta: { isWeekend: a.isWeekend, isHoliday: a.isHoliday } }
        );
        a.totalHours = computed.totalHours;
        a.regularHours = computed.regularHours;
        a.overtimeHours = computed.overtimeHours;
        a.totalMinutes = computed.totalMinutes;
        a.totalHoursDisplay = computed.totalHoursDisplay;
        a.regularHoursDisplay = computed.regularHoursDisplay;
        a.overtimeHoursDisplay = computed.overtimeHoursDisplay;
        a.dayOtHours = computed.dayOtHours;
        a.nightOtHours = computed.nightOtHours;
        a.sundayOtHours = computed.sundayOtHours;
        a.festivalOtHours = computed.festivalOtHours;
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
    const regularRow = [];
    const otRow = [];
    const noteRow = [];

    // Fetch salary rule once for this employee to determine weekends
    const rule = await getSalaryRuleForSubDepartment(emp.subDepartment?._id || emp.subDepartment);
    const workingDaysPerWeek = rule?.workingDaysPerWeek || 6;

    for (const d of days) {
      const rec = attMap[d.iso];
      const dayDate = new Date(d.iso);
      dayDate.setHours(0, 0, 0, 0);
      const dayOfWeek = dayDate.getDay();
      let isWeekend;
      if (workingDaysPerWeek === 6) {
        isWeekend = dayOfWeek === 0; // Sunday only
      } else if (workingDaysPerWeek === 5) {
        isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sat + Sun
      } else {
        isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      }
      const isPastDate = dayDate < today;
      const isAfterJoining = !empJoiningDate || dayDate >= empJoiningDate;

      if (rec) {
        statusRow.push(rec.status || 'present');
        inRow.push(rec.inTime || '');
        outRow.push(rec.outTime || '');
        workedRow.push(rec.totalHoursDisplay || (typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : ''));
        regularRow.push(rec.regularHoursDisplay || (typeof rec.regularHours !== 'undefined' ? String(rec.regularHours) : ''));
        otRow.push(rec.overtimeHoursDisplay || (typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : ''));
        noteRow.push(rec.note || '');
      } else if (isPastDate && !isWeekend && isAfterJoining) {
        statusRow.push('absent');
        inRow.push('');
        outRow.push('');
        workedRow.push('');
        regularRow.push('');
        otRow.push('');
        noteRow.push('Not marked');
      } else {
        statusRow.push(null);
        inRow.push(null);
        outRow.push(null);
        workedRow.push(null);
        regularRow.push(null);
        otRow.push(null);
        noteRow.push(null);
      }
    }
    const table = { Status: statusRow, In: inRow, Out: outRow, 'Worked Hours': workedRow, 'Regular Hours': regularRow, 'OT (Hours)': otRow, Note: noteRow };
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
    // const { date } = req.body; // Removed unused date destructuring

    if (!code) {
      return res.status(400).json({ success: false, message: 'Barcode code is required' });
    }

    // Find employee by empId (barcode code typically contains empId)
    const emp = await Employee.findOne({ empId: code }, { strictPopulate: false })
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation');

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found with this code' });
    }

    // Do not allow inactive employees to punch
    if (emp.status && emp.status.toString().toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'Employee is inactive' });
    }

    // Prefer client-provided timestamp when available to preserve user's local time.
    // Client should send `clientTs` (epoch ms) or `punchTime` (ISO) and optionally `tzOffsetMinutes`.
    let now;
    const clientTsRaw = req.body?.clientTs || req.body?.punchTime || req.query?.ts;
    if (clientTsRaw) {
      // try numeric epoch first
      const asNumber = Number(clientTsRaw);
      if (!Number.isNaN(asNumber)) now = new Date(asNumber);
      else now = new Date(clientTsRaw);
      if (!(now instanceof Date) || isNaN(now)) now = new Date();
    } else {
      now = new Date();
    }

    // Build display time string. If client provided timezone offset, compute client's local time string.
    const tzOffsetMinutes = typeof req.body?.tzOffsetMinutes !== 'undefined' ? Number(req.body.tzOffsetMinutes) : null;
    let currentTimeString;
    if (tzOffsetMinutes !== null && !Number.isNaN(tzOffsetMinutes)) {
      // clientOffset = minutes to add to local time to get UTC; to get local from UTC: local = utc - offset
      const clientLocal = new Date(now.getTime() - (tzOffsetMinutes * 60000));
      currentTimeString = clientLocal.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else {
      currentTimeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

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
    // Prevent punch for inactive employees
    if (emp.status && emp.status.toString().toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'Employee is inactive' })
    }
    // If existingAttendance provided, append IN punch
    if (existingAttendance) {
      existingAttendance.punchLogs = existingAttendance.punchLogs || [];
      existingAttendance.punchLogs.push({ punchType: 'IN', punchTime: now });
      existingAttendance.inTime = currentTimeString;
      // Recompute totals (no OUT yet, totals will be zero or previous)
      const shiftCfg_exist = await attendanceService.getShiftConfig();
      let shiftHours_exist = 0;
      if (emp.shift) {
        const text = String(emp.shift);
        const match = text.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          const parsed = Number(match[1]);
          if (!Number.isNaN(parsed) && parsed > 0) {
            shiftHours_exist = parsed;
          }
        }
      }
      if (!shiftHours_exist && typeof shiftCfg_exist.shiftHours === 'number' && shiftCfg_exist.shiftHours > 0) {
        shiftHours_exist = shiftCfg_exist.shiftHours;
      }
      if (!shiftHours_exist) shiftHours_exist = 8;
      const computed = attendanceService.computeTotalsFromPunchLogs(
        existingAttendance.punchLogs,
        shiftHours_exist,
        { countOpenAsNow: true, dayMeta: { isWeekend: existingAttendance.isWeekend, isHoliday: existingAttendance.isHoliday } }
      );
      existingAttendance.totalHours = computed.totalHours;
      existingAttendance.regularHours = computed.regularHours;
      existingAttendance.overtimeHours = computed.overtimeHours;
      existingAttendance.totalMinutes = computed.totalMinutes;
      existingAttendance.totalHoursDisplay = computed.totalHoursDisplay;
      existingAttendance.regularHoursDisplay = computed.regularHoursDisplay;
      existingAttendance.overtimeHoursDisplay = computed.overtimeHoursDisplay;
      existingAttendance.dayOtHours = computed.dayOtHours;
      existingAttendance.nightOtHours = computed.nightOtHours;
      existingAttendance.sundayOtHours = computed.sundayOtHours;
      existingAttendance.festivalOtHours = computed.festivalOtHours;
      await existingAttendance.save();
      
      // Record punch in debounce cache
      attendanceService.recordPunch(emp._id.toString(), 'IN');
      
      // Update monthly summary immediately
      const now2 = new Date();
      const currentYear2 = now2.getFullYear();
      const currentMonth2 = now2.getMonth() + 1; // 1-12
      const atts2 = await Attendance.find({
        employee: emp._id,
        date: {
          $gte: new Date(`${currentYear2}-${String(currentMonth2).padStart(2, '0')}-01T00:00:00Z`),
          $lt: new Date(currentMonth2 === 12 ? currentYear2 + 1 : currentYear2, currentMonth2 === 12 ? 0 : currentMonth2, 1)
        }
      }).lean();
      const days2 = monthDays(currentYear2, currentMonth2);
      await updateMonthlySummary(emp._id, currentYear2, currentMonth2, atts2, days2, emp.joiningDate);

      // Fetch updated summary for real-time emit
      const updatedSummary2 = await MonthlySummary.findOne({ 
        employee: emp._id, 
        year: currentYear2, 
        month: currentMonth2 
      });
      
      // Check for continuous IN across configured boundary (e.g., 7AM)
      await attendanceService.handleContinuousINAcross8AM(emp._id, attendanceIso, Attendance);

      await emp.populate('headDepartment');
      await emp.populate('subDepartment');
      await emp.populate('designation');
      await emp.populate('reportsTo', 'name empId');

      // emit socket update
      try {
        const io = getIO();
        if (io) io.emit('attendance:updated', { 
          employee: emp._id.toString(), 
          attendance: existingAttendance, 
          type: 'in',
          summary: updatedSummary2 
        });
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
    // determine weekend based on salary rule for this employee
    let isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    try {
      const rule = await getSalaryRuleForSubDepartment(emp.subDepartment?._id || emp.subDepartment);
      const workingDaysPerWeek = rule?.workingDaysPerWeek || 6;
      if (workingDaysPerWeek === 6) isWeekend = dayOfWeek === 0;
      if (workingDaysPerWeek === 5) isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    } catch (e) {
      isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    }

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
      dayOtHours: 0,
      breakMinutes: 0,
      isWeekend,
      isHoliday: false,
      punchLogs: [ { punchType: 'IN', punchTime: now } ],
      note: 'Punch IN via barcode scanner'
    });
    
    // Record punch in debounce cache
    attendanceService.recordPunch(emp._id.toString(), 'IN');
    
    // Update monthly summary immediately
    const now3 = new Date();
    const currentYear3 = now3.getFullYear();
    const currentMonth3 = now3.getMonth() + 1; // 1-12
    const atts3 = await Attendance.find({
      employee: emp._id,
      date: {
        $gte: new Date(`${currentYear3}-${String(currentMonth3).padStart(2, '0')}-01T00:00:00Z`),
        $lt: new Date(currentMonth3 === 12 ? currentYear3 + 1 : currentYear3, currentMonth3 === 12 ? 0 : currentMonth3, 1)
      }
    }).lean();
    const days3 = monthDays(currentYear3, currentMonth3);
    await updateMonthlySummary(emp._id, currentYear3, currentMonth3, atts3, days3, emp.joiningDate);

    // Fetch updated summary for real-time emit
    const updatedSummary3 = await MonthlySummary.findOne({ 
      employee: emp._id, 
      year: currentYear3, 
      month: currentMonth3 
    });
    
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
      if (io) io.emit('attendance:updated', { 
        employee: emp._id.toString(), 
        attendance: newAttendanceDoc, 
        type: 'in',
        summary: updatedSummary3 
      });
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
    // Prevent punch for inactive employees
    if (emp.status && emp.status.toString().toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'Employee is inactive' })
    }
    const attendance = attendanceDoc;

    // Append OUT punch and recompute totals/pairs from punchLogs
    attendance.punchLogs = attendance.punchLogs || [];
    attendance.punchLogs.push({ punchType: 'OUT', punchTime: now });

    const shiftCfg_out = await attendanceService.getShiftConfig();
    let shiftHours_out = 0;
    if (emp.shift) {
      const text = String(emp.shift);
      const match = text.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed) && parsed > 0) {
          shiftHours_out = parsed;
        }
      }
    }
    if (!shiftHours_out && typeof shiftCfg_out.shiftHours === 'number' && shiftCfg_out.shiftHours > 0) {
      shiftHours_out = shiftCfg_out.shiftHours;
    }
    if (!shiftHours_out) shiftHours_out = 8;
    const computed = attendanceService.computeTotalsFromPunchLogs(
      attendance.punchLogs,
      shiftHours_out,
      { dayMeta: { isWeekend: attendance.isWeekend, isHoliday: attendance.isHoliday } }
    );
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
    attendance.dayOtHours = computed.dayOtHours;
    attendance.nightOtHours = computed.nightOtHours;
    attendance.sundayOtHours = computed.sundayOtHours;
    attendance.festivalOtHours = computed.festivalOtHours;
    attendance.inTime = computed.lastInTime ? new Date(computed.lastInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendance.inTime;
    attendance.outTime = computed.lastOutTime ? new Date(computed.lastOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendance.outTime;
    attendance.note = `Punch OUT via barcode scanner | Total: ${computed.totalHoursDisplay} | Regular: ${computed.regularHoursDisplay} | OT: ${computed.overtimeHoursDisplay}`;

    await attendance.save();
    
    // Record punch in debounce cache
    attendanceService.recordPunch(emp._id.toString(), 'OUT');

    // Update monthly summary immediately
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const atts = await Attendance.find({
      employee: emp._id,
      date: {
        $gte: new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00Z`),
        $lt: new Date(currentMonth === 12 ? currentYear + 1 : currentYear, currentMonth === 12 ? 0 : currentMonth, 1)
      }
    }).lean();
    const days = monthDays(currentYear, currentMonth);
    await updateMonthlySummary(emp._id, currentYear, currentMonth, atts, days, emp.joiningDate);

    // Fetch updated summary for real-time emit
    const updatedSummary = await MonthlySummary.findOne({ 
      employee: emp._id, 
      year: currentYear, 
      month: currentMonth 
    });

    // Re-populate employee relations for response
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('designation');
    await emp.populate('reportsTo', 'name empId');

    // emit socket update for out
    try {
      const io = getIO();
      if (io) io.emit('attendance:updated', { 
        employee: emp._id.toString(), 
        attendance, 
        type: 'out',
        summary: updatedSummary 
      });
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
export async function updateMonthlySummary(employeeId, year, month, attendances, days, empJoiningDate) {
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

    // Determine workingDaysPerWeek for this employee to decide weekends
    let workingDaysPerWeek = 6;
    try {
      const emp = await Employee.findById(employeeId).lean();
      const rule = emp?.subDepartment ? await getSalaryRuleForSubDepartment(emp.subDepartment._id || emp.subDepartment) : null;
      workingDaysPerWeek = rule?.workingDaysPerWeek || 6;
    } catch (e) {
      workingDaysPerWeek = 6;
    }

    // Count status for each day
    for (const d of days) {
      const dayDate = new Date(d.iso);
      dayDate.setHours(0, 0, 0, 0);
      const dayOfWeek = dayDate.getDay();
      let isWeekend;
      if (workingDaysPerWeek === 6) {
        isWeekend = dayOfWeek === 0; // Sunday only
      } else if (workingDaysPerWeek === 5) {
        isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sat + Sun
      } else {
        isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      }
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