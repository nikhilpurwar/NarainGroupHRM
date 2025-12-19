import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";

const monthDays = (year, month) => {
  // month: 1-12
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  const arr = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(y, m - 1, d);
    const iso = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
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
          workedRow.push(typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : '');
          otRow.push(typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : '');
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
        workedRow.push(typeof rec.totalHours !== 'undefined' ? String(rec.totalHours) : '');
        otRow.push(typeof rec.overtimeHours !== 'undefined' ? String(rec.overtimeHours) : '');
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
      .populate('group')
      .populate('designation')
      .populate('reportsTo', 'name empId');

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found with this code' });
    }

    const now = new Date();
    const currentTimeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // ======== 72-HOUR RULE ========
    // Find the most recent incomplete attendance (punch IN without punch OUT) from Attendance collection
    let incompleteAttendance = await attendanceService.findIncompleteAttendance(emp._id);

    // If incomplete attendance exists, check 72-hour rule
    if (incompleteAttendance) {
      // find the last IN time from punchLogs
      let lastIn = null;
      if (Array.isArray(incompleteAttendance.punchLogs)) {
        for (let i = incompleteAttendance.punchLogs.length - 1; i >= 0; i--) {
          if ((incompleteAttendance.punchLogs[i].punchType || '').toUpperCase() === 'IN') {
            lastIn = new Date(incompleteAttendance.punchLogs[i].punchTime);
            break;
          }
        }
      }
      const punchInTime = lastIn || new Date(incompleteAttendance.date);
      const timeDiffHours = (now - punchInTime) / (1000 * 60 * 60);

      // If within 72 hours, mark PUNCH OUT
      if (timeDiffHours < 72) {
        return handlePunchOut(emp, incompleteAttendance, now, currentTimeString, res);
      }
      // If > 72 hours, fall through to create a new IN
    }

    // ======== PUNCH IN ========
    return handlePunchIn(emp, now, currentTimeString, res);

  } catch (err) {
    console.error('Barcode attendance error:', err);
    const e = handleMongooseError(err)
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message))
  }
};

// Handle Punch IN
async function handlePunchIn(emp, now, currentTimeString, res) {
  try {
    const todayDateObj = new Date(now.toDateString());
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    // Create new attendance document in Attendance collection
    const newAttendanceDoc = await Attendance.create({
      employee: emp._id,
      date: todayDateObj,
      status: 'present',
      inTime: currentTimeString,
      outTime: null,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      breakMinutes: 0,
      isWeekend,
      isHoliday: false,
      punchLogs: [ { punchType: 'IN', punchTime: now } ],
      note: 'Punch IN via barcode scanner'
    });

    // Re-populate employee relations for response
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('group');
    await emp.populate('designation');
    await emp.populate('reportsTo', 'name empId');

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
    attendance.inTime = computed.lastInTime ? new Date(computed.lastInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendance.inTime;
    attendance.outTime = computed.lastOutTime ? new Date(computed.lastOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendance.outTime;
    attendance.note = `Punch OUT via barcode scanner | Total: ${totalHours}h | Regular: ${regularHours}h | OT: ${overtimeHours}h`;

    await attendance.save();

    // Re-populate employee relations for response
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('group');
    await emp.populate('designation');
    await emp.populate('reportsTo', 'name empId');

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