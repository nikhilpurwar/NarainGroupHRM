import Employee from "../models/employee.model.js";
import User from "../models/setting.model/user.model.js";
import Attendance from "../models/attendance.model.js";
import Advance from "../models/advance.model.js";
import MonthlySummary from "../models/monthlySummary.model.js";
import MonthlySalaryModel from "../models/salary.model/monthlySalary.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
import salaryRecalcService from "../services/salaryRecalculation.service.js";
import { getSalaryRuleForSubDepartment } from "../services/salary.service.js";
import bwipjs from "bwip-js";
import QRCode from "qrcode";
import { getIO } from "../utils/socket.util.js";
import { updateMonthlySummary } from "./attendance.controller.js";

// attendanceIso logic moved to attendance.service.getAttendanceIsoForTimestamp (async)

const generateBarcodeDataUrl = (text) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: "code128",       // Barcode type
      text: String(text),
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    }, function (err, png) {
      if (err) return reject(err);
      const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
      resolve(dataUrl);
    });
  });
};

const generateQrDataUrl = async (text) => {
  return await QRCode.toDataURL(String(text));
};

// Helper: determine if a given date is weekend for an employee,
// based on SalaryRule. Uses workingDaysPerWeek (5 or 6):
// - 6 => Sunday only is weekend
// - 5 => Saturday + Sunday are weekend
// Fallback: calendar Saturday/Sunday.
const isWeekendForEmployee = async (emp, dateObj) => {
  try {
    const subDeptId = emp?.subDepartment?._id || emp?.subDepartment || null;
    const rule = subDeptId ? await getSalaryRuleForSubDepartment(subDeptId) : null;
    const workingDaysPerWeek = rule?.workingDaysPerWeek || 6;
    const dow = dateObj.getDay(); // 0=Sun, 6=Sat

    if (workingDaysPerWeek === 6) {
      return dow === 0; // Sunday only
    }
    if (workingDaysPerWeek === 5) {
      return dow === 0 || dow === 6; // Saturday + Sunday
    }
    // Safe fallback: treat Sat/Sun as weekend
    return dow === 0 || dow === 6;
  } catch (e) {
    const dow = dateObj.getDay();
    return dow === 0 || dow === 6;
  }
};

export const createEmployee = async (req, res) => {
  try {
    // create employee first
    const emp = await Employee.create(req.body);

    // generate barcode and QR based on empId (fallback to _id)
    try {
      const codeText = emp.empId || emp._id.toString();
      const [barcodeDataUrl, qrDataUrl] = await Promise.all([
        generateBarcodeDataUrl(codeText),
        generateQrDataUrl(codeText),
      ]);
      emp.barcode = barcodeDataUrl;
      emp.qrCode = qrDataUrl;
      await emp.save();
    } catch (genErr) {
      console.error("Code generation failed:", genErr.message);
    }

    // Recalculate salary for current and previous month
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
      console.error('Salary recalculation failed:', err)
    );

    res.status(201).json({ success: true, data: emp });
  } catch (err) {
    const { apiError: apiErr, handleMongooseError } = await import('../utils/error.util.js')
      .then(m => ({ apiError: m.apiError, handleMongooseError: m.handleMongooseError }))
      .catch(() => ({}));

    if (handleMongooseError && apiErr) {
      const e = handleMongooseError(err);
      return res.status(e.status || 500).json(apiErr(e.code || 'internal_error', e.message || err.message));
    }

    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const emps = await Employee.find()
      .select('name empId fatherName mobile salary status headDepartment subDepartment designation avatar')
      .populate('headDepartment', 'name')
      .populate('subDepartment', 'name')
      .populate('designation', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: emps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id)
      .populate('headDepartment', 'name')
      .populate('subDepartment', 'name')
      .populate('designation', 'name')
      .lean();

    if (!emp) return res.status(404).json({ success: false, message: "Not found" });

    // If requester is not Admin, allow access only to their own employee profile
    try {
      const requester = req.user && req.user.id ? await User.findById(req.user.id).lean() : null
          const role = (requester?.role || (req.user && req.user.role) || '').toString().toLowerCase()
          if (role !== 'admin') {
        const requesterEmail = requester?.email
        // Allow if user's email matches employee.empId or employee.email
        if (!requesterEmail || (emp.empId !== requesterEmail && emp.email !== requesterEmail)) {
          return res.status(403).json({ success: false, message: 'Forbidden' })
        }
      }
    } catch (e) {
      // if user lookup fails, deny access for non-admins
          if (!(req.user && (req.user.role || '').toString().toLowerCase() === 'admin')) return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addAttendance = async (req, res) => {
  try {
    const { date, status, inTime, outTime, note } = req.body || {};

    let emp;
    if (req.query.code) {
      // Barcode mode: find by empId
      emp = await Employee.findOne({ empId: req.query.code })
        .populate('headDepartment', 'name')
        .populate('subDepartment', 'name')
        .populate('designation', 'name');
    } else {
      // Manual mode: find by _id
      emp = await Employee.findById(req.params.id)
        .populate('headDepartment', 'name')
        .populate('subDepartment', 'name')
        .populate('designation', 'name');
    }

    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

    // Block operations for inactive employees
    if (emp.status && emp.status.toString().toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'Employee is inactive' })
    }

    // If no explicit inTime/outTime provided, treat this as a punch toggle (IN/OUT) using configured boundary
    if (!inTime && !outTime) {
      const now = new Date();
      const currentTimeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const attendanceIso = await attendanceService.getAttendanceIsoForTimestamp(now);

      // Check for duplicate punch (debounce)
      if (attendanceService.isPunchDuplicate(emp._id.toString(), null)) {
        return res.status(400).json({ success: false, message: 'Duplicate punch detected. Please try again after a few seconds.' });
      }

      const attendanceDoc = await Attendance.findOne({
        employee: emp._id,
        date: {
          $gte: new Date(`${attendanceIso}T00:00:00Z`),
          $lte: new Date(`${attendanceIso}T23:59:59Z`)
        }
      });

      if (attendanceDoc) {
        const lastPunch = Array.isArray(attendanceDoc.punchLogs) && attendanceDoc.punchLogs.length > 0 ? (attendanceDoc.punchLogs[attendanceDoc.punchLogs.length - 1].punchType || '').toUpperCase() : null;
        if (lastPunch === 'IN') {
          // Perform Punch OUT: append OUT, compute totals, save
          attendanceDoc.punchLogs = attendanceDoc.punchLogs || [];
          attendanceDoc.punchLogs.push({ punchType: 'OUT', punchTime: now });
          // Re-evaluate weekend flag using SalaryRule
          if (attendanceDoc.date) {
            attendanceDoc.isWeekend = await isWeekendForEmployee(emp, new Date(attendanceDoc.date));
          }
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
          const computed = attendanceService.computeTotalsFromPunchLogs(
            attendanceDoc.punchLogs,
            shiftHours,
            { dayMeta: { isWeekend: attendanceDoc.isWeekend, isHoliday: attendanceDoc.isHoliday } }
          );
          attendanceDoc.totalHours = computed.totalHours;
          attendanceDoc.regularHours = computed.regularHours;
          attendanceDoc.overtimeHours = computed.overtimeHours;
          attendanceDoc.dayOtHours = computed.dayOtHours;
          attendanceDoc.nightOtHours = computed.nightOtHours;
          attendanceDoc.sundayOtHours = computed.sundayOtHours;
          attendanceDoc.festivalOtHours = computed.festivalOtHours;
          attendanceDoc.totalMinutes = computed.totalMinutes;
          attendanceDoc.totalHoursDisplay = computed.totalHoursDisplay;
          attendanceDoc.regularHoursDisplay = computed.regularHoursDisplay;
          attendanceDoc.overtimeHoursDisplay = computed.overtimeHoursDisplay;
          attendanceDoc.inTime = computed.lastInTime ? new Date(computed.lastInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendanceDoc.inTime;
          attendanceDoc.outTime = computed.lastOutTime ? new Date(computed.lastOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendanceDoc.outTime;
          // attendanceDoc.note = `Punch OUT via manual toggle | Total: ${computed.totalHours}h | Regular: ${computed.regularHours}h | OT: ${computed.overtimeHours}h`;
          attendanceDoc.note = `Punch OUT via manual toggle`;

          await attendanceDoc.save();

          // Recalculate salary for current and previous month
          salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
            console.error('Salary recalculation failed:', err)
          );

          // Record punch in debounce cache
          attendanceService.recordPunch(emp._id.toString(), 'OUT');

          await emp.populate('headDepartment');
          await emp.populate('subDepartment');
          await emp.populate('designation');

          // Update monthly summary and emit socket update with summary
          try {
            const attDate = attendanceDoc.date ? new Date(attendanceDoc.date) : new Date();
            const year = attDate.getFullYear();
            const month = attDate.getMonth() + 1;
            const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00Z`);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            const attsForMonth = await Attendance.find({ employee: emp._id, date: { $gte: start, $lt: end } }).lean();
            const days = (function(y, m){ const d = new Date(y, m, 0).getDate(); return new Array(d).fill(0).map((_,i)=> ({ date: String(i+1).padStart(2,'0'), iso: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, day: ''})); })(year, month);
            await updateMonthlySummary(emp._id, year, month, attsForMonth, days, emp.joiningDate);
            const updatedSummary = await MonthlySummary.findOne({ employee: emp._id, year, month }).lean();
            const io = getIO();
            if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: attendanceDoc, type: 'out', summary: updatedSummary });
          } catch (e) {
            console.warn('Socket emit / summary update failed', e.message || e);
          }

          return res.status(200).json({ success: true, type: 'out', message: 'Punch OUT successful', attendance: attendanceDoc, employee_id: emp._id, time: currentTimeString, employee_name: emp.name });
        } else {
          // Append IN to existing attendance
          attendanceDoc.punchLogs = attendanceDoc.punchLogs || [];
          attendanceDoc.punchLogs.push({ punchType: 'IN', punchTime: now });
          attendanceDoc.inTime = currentTimeString;
          // Re-evaluate weekend flag using SalaryRule
          if (attendanceDoc.date) {
            attendanceDoc.isWeekend = await isWeekendForEmployee(emp, new Date(attendanceDoc.date));
          }
          const shiftCfg2 = await attendanceService.getShiftConfig();
          let shiftHours2 = 0;
          if (emp.shift) {
            const text = String(emp.shift);
            const match = text.match(/(\d+(?:\.\d+)?)/);
            if (match) {
              const parsed = Number(match[1]);
              if (!Number.isNaN(parsed) && parsed > 0) {
                shiftHours2 = parsed;
              }
            }
          }
          if (!shiftHours2 && typeof shiftCfg2.shiftHours === 'number' && shiftCfg2.shiftHours > 0) {
            shiftHours2 = shiftCfg2.shiftHours;
          }
          if (!shiftHours2) shiftHours2 = 8;
          const computed = attendanceService.computeTotalsFromPunchLogs(
            attendanceDoc.punchLogs,
            shiftHours2,
            { countOpenAsNow: true, dayMeta: { isWeekend: attendanceDoc.isWeekend, isHoliday: attendanceDoc.isHoliday } }
          );
          attendanceDoc.totalHours = computed.totalHours;
          attendanceDoc.regularHours = computed.regularHours;
          attendanceDoc.overtimeHours = computed.overtimeHours;
          attendanceDoc.dayOtHours = computed.dayOtHours;
          attendanceDoc.nightOtHours = computed.nightOtHours;
          attendanceDoc.sundayOtHours = computed.sundayOtHours;
          attendanceDoc.festivalOtHours = computed.festivalOtHours;
          attendanceDoc.totalMinutes = computed.totalMinutes;
          attendanceDoc.totalHoursDisplay = computed.totalHoursDisplay;
          attendanceDoc.regularHoursDisplay = computed.regularHoursDisplay;
          attendanceDoc.overtimeHoursDisplay = computed.overtimeHoursDisplay;
          await attendanceDoc.save();

          // Recalculate salary for current and previous month
          salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
            console.error('Salary recalculation failed:', err)
          );

          // Record punch in debounce cache
          attendanceService.recordPunch(emp._id.toString(), 'IN');

          // Check for continuous IN across configured boundary (e.g., 7AM)
          await attendanceService.handleContinuousINAcross8AM(emp._id, attendanceIso, Attendance);

          await emp.populate('headDepartment');
          await emp.populate('subDepartment');
          await emp.populate('designation');

          // Update monthly summary and emit socket update with summary
          try {
            const attDate = attendanceDoc.date ? new Date(attendanceDoc.date) : new Date();
            const year = attDate.getFullYear();
            const month = attDate.getMonth() + 1;
            const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00Z`);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            const attsForMonth = await Attendance.find({ employee: emp._id, date: { $gte: start, $lt: end } }).lean();
            const days = (function(y, m){ const d = new Date(y, m, 0).getDate(); return new Array(d).fill(0).map((_,i)=> ({ date: String(i+1).padStart(2,'0'), iso: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, day: ''})); })(year, month);
            await updateMonthlySummary(emp._id, year, month, attsForMonth, days, emp.joiningDate);
            const updatedSummary = await MonthlySummary.findOne({ employee: emp._id, year, month }).lean();
            const io = getIO();
            if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: attendanceDoc, type: 'in', summary: updatedSummary });
          } catch (e) {
            console.warn('Socket emit / summary update failed', e.message || e);
          }

          return res.status(200).json({ success: true, type: 'in', message: 'Punch IN appended', attendance: attendanceDoc, employee_id: emp._id, time: currentTimeString, employee_name: emp.name });
        }
      }

      // Create new attendance and mark IN
      const dateObj = new Date(`${attendanceIso}T00:00:00Z`);
      const isWeekend2 = await isWeekendForEmployee(emp, dateObj);
      const newAtt = await Attendance.create({
        employee: emp._id,
        date: dateObj,
        status: 'present',
        inTime: currentTimeString,
        outTime: null,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        nightOtHours: 0,
        sundayOtHours: 0,
        festivalOtHours: 0,
        totalMinutes: 0,
        totalHoursDisplay: '0h 0m',
        regularHoursDisplay: '0h 0m',
        overtimeHoursDisplay: '0h 0m',
        breakMinutes: 0,
        isWeekend: isWeekend2,
        isHoliday: false,
        punchLogs: [{ punchType: 'IN', punchTime: now }],
        note: 'Punch IN via manual toggle'
      });

      // Record punch in debounce cache
      attendanceService.recordPunch(emp._id.toString(), 'IN');

      // Recalculate salary for current and previous month
      salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err =>
        console.error('Salary recalculation failed:', err)
      );

      // Check for continuous IN across configured boundary (e.g., 7AM)
      await attendanceService.handleContinuousINAcross8AM(emp._id, attendanceIso, Attendance);

      await emp.populate('headDepartment');
      await emp.populate('subDepartment');
      await emp.populate('designation');

      // Update monthly summary and emit socket update with summary
      try {
        const attDate = newAtt.date ? new Date(newAtt.date) : new Date();
        const year = attDate.getFullYear();
        const month = attDate.getMonth() + 1;
        const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00Z`);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const attsForMonth = await Attendance.find({ employee: emp._id, date: { $gte: start, $lt: end } }).lean();
        const days = (function(y, m){ const d = new Date(y, m, 0).getDate(); return new Array(d).fill(0).map((_,i)=> ({ date: String(i+1).padStart(2,'0'), iso: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, day: ''})); })(year, month);
        await updateMonthlySummary(emp._id, year, month, attsForMonth, days, emp.joiningDate);
        const updatedSummary = await MonthlySummary.findOne({ employee: emp._id, year, month }).lean();
        const io = getIO();
        if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: newAtt, type: 'in', summary: updatedSummary });
      } catch (e) {
        console.warn('Socket emit / summary update failed', e.message || e);
      }

      return res.status(201).json({ success: true, type: 'in', message: 'Punch IN successful', attendance: newAtt, employee_id: emp._id, time: currentTimeString, employee_name: emp.name });
    }

    // Manual explicit attendance creation (inTime/outTime provided) - preserve previous behavior
    if (!date) return res.status(400).json({ success: false, message: "date is required" });

    // Check for duplicate attendance on same date in Attendance collection
    const dateObj = new Date(date);
    const dateIso = dateObj.toISOString().slice(0, 10);

    const existingAttendance = await Attendance.findOne({
      employee: emp._id, date: {
        $gte: new Date(`${dateIso}T00:00:00Z`),
        $lte: new Date(`${dateIso}T23:59:59Z`)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ success: false, message: "Attendance already marked for this date" });
    }

    // If manual marking (no inTime provided), capture current time as inTime
    let capturedInTime = inTime;
    if (!capturedInTime) {
      const now = new Date();
      capturedInTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Check for weekend
    const isWeekend = await isWeekendForEmployee(emp, new Date(date));

    // Create Attendance document (use model static helper)
    // build punch log timestamps using service helper
    // If client provided a timezone offset, parse times using that offset so stored instants match user's local time
    const tzOffsetMinutes = (typeof req.body?.tzOffsetMinutes !== 'undefined') ? Number(req.body.tzOffsetMinutes) : null;

    const normalizeTimeToDateWithOffset = (dateIsoStr, timeStr, tzOffsetMin) => {
      if (!dateIsoStr || !timeStr) return null;
      // reuse parsing logic to normalize HH:MM:SS (handle AM/PM)
      let t = String(timeStr).trim()
      const ampm = /\s?(AM|PM)$/i.exec(t)
      if (ampm) {
        const parts = t.replace(/\s?(AM|PM)$/i, '').split(':').map(p => p.trim())
        let hh = parseInt(parts[0])
        const mm = parts[1] ? parts[1].padStart(2, '0') : '00'
        const ss = parts[2] ? parts[2].padStart(2, '0') : '00'
        const isPm = /PM/i.test(ampm[0])
        if (isPm && hh < 12) hh += 12
        if (!isPm && hh === 12) hh = 0
        t = `${String(hh).padStart(2,'0')}:${mm}:${ss}`
      } else {
        const parts = t.split(':')
        if (parts.length === 2) t = `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}:00`
        if (parts.length === 1) t = `${parts[0].padStart(2,'0')}:00:00`
      }

      if (tzOffsetMin === null || typeof tzOffsetMin === 'undefined' || Number.isNaN(tzOffsetMin)) {
        // fallback to existing service parsing (server-local interpretation)
        return attendanceService.parseDateTime(dateIsoStr, t)
      }

      // Build ISO with explicit timezone offset (e.g. 2026-01-12T14:54:00+05:30)
      const sign = tzOffsetMin <= 0 ? '+' : '-'
      const absMin = Math.abs(tzOffsetMin)
      const offH = String(Math.floor(absMin / 60)).padStart(2, '0')
      const offM = String(absMin % 60).padStart(2, '0')
      const isoWithOffset = `${dateIsoStr}T${t}${sign}${offH}:${offM}`
      const dt = new Date(isoWithOffset)
      if (Number.isNaN(dt.getTime())) return attendanceService.parseDateTime(dateIsoStr, t)
      return dt
    }

    const inPunch = capturedInTime ? normalizeTimeToDateWithOffset(dateIso, capturedInTime, tzOffsetMinutes) : null
    let outPunch = outTime ? normalizeTimeToDateWithOffset(dateIso, outTime, tzOffsetMinutes) : null

    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let dayOtHours = 0;
    let nightOtHours = 0;
    let sundayOtHours = 0;
    let festivalOtHours = 0;
    let totalMinutes = inPunch && outPunch ? Math.round((outPunch - inPunch) / 60000) : 0;

    if (inPunch && outPunch) {
      // If out time is earlier than or equal to in time on the same calendar date,
      // treat it as crossing midnight into the next day (e.g. 08:00 to 12:00am -> 16h).
      if (outPunch <= inPunch) {
        outPunch = new Date(outPunch.getTime() + 24 * 60 * 60 * 1000);
      }

      // Derive shift hours safely from employee.shift text (e.g. "Morning B (10 hours)")
      let shiftHours = 8;
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

      if (Number.isNaN(shiftHours) || !shiftHours) {
        shiftHours = 8;
      }

      const computed = attendanceService.computeTotalsFromPunchLogs(
        [
          { punchType: 'IN', punchTime: inPunch },
          { punchType: 'OUT', punchTime: outPunch }
        ],
        shiftHours,
        { dayMeta: { isWeekend, isHoliday: false } }
      );

      totalHours = computed.totalHours;
      regularHours = computed.regularHours;
      overtimeHours = computed.overtimeHours;
      dayOtHours = computed.dayOtHours;
      nightOtHours = computed.nightOtHours;
      sundayOtHours = computed.sundayOtHours;
      festivalOtHours = computed.festivalOtHours;
      totalMinutes = computed.totalMinutes;
    }

    const att = await Attendance.safeCreate({
      employee: emp._id,
      date: new Date(date),
      status: status || 'present',
      inTime: capturedInTime,
      outTime,
      totalHours,
      totalMinutes,
      regularHours,
      overtimeHours,
      dayOtHours,
      nightOtHours,
      sundayOtHours,
      festivalOtHours,
      breakMinutes: 0,
      isWeekend,
      isHoliday: false,
      punchLogs: [
        ...(inPunch ? [{ punchType: 'IN', punchTime: inPunch }] : []),
        ...(outPunch ? [{ punchType: 'OUT', punchTime: outPunch }] : [])
      ],
      note: note || 'Marked manually'
    });

    // Recalculate monthly salary for the month of this manual attendance date
    salaryRecalcService
      .recalculateAndUpdateMonthlySalary(new Date(date))
      .catch(err => console.error('Salary recalculation failed (manual attendance):', err));
    // Update monthly summary and emit socket update so UI updates in real-time
    try {
      const attDate = new Date(date);
      const year = attDate.getFullYear();
      const month = attDate.getMonth() + 1; // 1-12
      // fetch attendances for that month
      const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const atts = await Attendance.find({
        employee: emp._id,
        date: { $gte: start, $lt: end }
      }).lean();

      const days = (function(y, m){ const d = new Date(y, m, 0).getDate(); return new Array(d).fill(0).map((_,i)=> ({ date: String(i+1).padStart(2,'0'), iso: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, day: ''})); })(year, month);

      await updateMonthlySummary(emp._id, year, month, atts, days, emp.joiningDate);

      const updatedSummary = await MonthlySummary.findOne({ employee: emp._id, year, month }).lean();
      try {
        const io = getIO();
        if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: att, type: 'manual', summary: updatedSummary });
      } catch (e) {
        console.warn('Socket emit failed (manual attendance)', e.message || e);
      }
    } catch (e) {
      console.warn('Failed to update monthly summary after manual attendance', e && e.message ? e.message : e);
    }

    res.json({ success: true, message: 'Attendance marked successfully', data: { employee: emp, attendanceRecord: att } });
  } catch (err) {
    console.error('AddAttendance error:', err)
    const e = handleMongooseError(err)
    return res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message))
  }
};

export const getAttendance = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    const records = await Attendance.find({ employee: emp._id }).sort({ date: 1 }).lean();
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBarcodes = async (req, res) => {
  try {
    const list = await Employee.find({ barcode: { $exists: true, $ne: null } }, { name: 1, empId: 1, barcode: 1 }).sort({ name: 1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getQRCodes = async (req, res) => {
  try {
    const list = await Employee.find({ qrCode: { $exists: true, $ne: null } }, { name: 1, empId: 1, qrCode: 1 }).sort({ name: 1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployeeProfile = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id)
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation');
    if (!emp) return res.status(404).json({ success: false, message: "Not found" });
    // Same access control as getEmployeeById
    try {
      const requester = req.user && req.user.id ? await User.findById(req.user.id).lean() : null
      const role = (requester?.role || (req.user && req.user.role) || '').toString().toLowerCase()
      if (role !== 'admin') {
        const requesterEmail = requester?.email
        if (!requesterEmail || (emp.empId !== requesterEmail && emp.email !== requesterEmail)) {
          return res.status(403).json({ success: false, message: 'Forbidden' })
        }
      }
    } catch (e) {
      if (!(req.user && (req.user.role || '').toString().toLowerCase() === 'admin')) return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: "Not found" });
    // Block modifications for inactive employees by non-admins
    try {
      const requesterRole = req.user && req.user.role ? req.user.role.toString().toLowerCase() : null
          if (emp.status && emp.status.toString().toLowerCase() !== 'active' && requesterRole !== 'admin') {
        return res.status(403).json({ success: false, message: 'Employee is inactive' })
      }
    } catch (e) {
      // ignore and continue; fail-safe will block unauthorized later
    }
    const prevEmpId = emp.empId;
    Object.assign(emp, req.body);
    // if empId changed or missing, regenerate barcode/QR
    if (req.body.empId && req.body.empId !== prevEmpId) {
      try {
        const codeText = req.body.empId || emp._id.toString();
        emp.barcode = await generateBarcodeDataUrl(codeText);
        emp.qrCode = await generateQrDataUrl(codeText);
      } catch (genErr) {
        console.error("Code regeneration failed:", genErr.message);
      }
    }
    await emp.save();
    
    // Recalculate salary when employee data changes
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
      console.error('Salary recalculation failed:', err)
    );
    
    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: "Not found" });

    // Cascade cleanup: attendance, advances, monthly summaries
    try {
      await Promise.all([
        Attendance.deleteMany({ employee: emp._id }),
        Advance.deleteMany({ employee: emp._id }),
        MonthlySummary.deleteMany({ employee: emp._id })
      ]);

      // Remove entries related to this employee from MonthlySalary.items
      // Items may reference employee via `empId` (string) or numeric/string IDs.
      const empKeys = [String(emp._id), String(emp.empId || '')].filter(Boolean);
      if (empKeys.length) {
        const monthlyRecords = await MonthlySalaryModel.find({ 'items.empId': { $in: empKeys } });
        for (const rec of monthlyRecords) {
          const filtered = (rec.items || []).filter(it => {
            const itemKey = String(it?.empId || it?.id || it?._id || '')
            return !empKeys.includes(itemKey)
          })
          rec.items = filtered
          rec.totalRecords = filtered.length || 0
          await rec.save()
        }
      }

      // Trigger salary recalculation for current + previous month to keep caches consistent
      try {
        salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(() => {})
      } catch (e) {
        // ignore
      }
    } catch (cleanupErr) {
      console.error('Employee cascade cleanup failed:', cleanupErr);
      // continue returning success for deletion of employee record itself
    }

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark attendance via barcode scanner (matches Laravel 72-hour rule)
export const markAttendanceByBarcode = async (req, res) => {
  try {
    const { code } = req.query;

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
        return handlePunchOutBarcode(emp, attendanceDoc, now, currentTimeString, res);
      } else {
        // mark IN (append to existing doc)
        return handlePunchInBarcode(emp, now, currentTimeString, res, attendanceIso, attendanceDoc);
      }
    }

    // No attendance doc => create new and mark IN
    return handlePunchInBarcode(emp, now, currentTimeString, res, attendanceIso, null);

  } catch (err) {
    console.error('Barcode attendance error:', err);
    const e = handleMongooseError(err)
    res.status(e.status || 500).json(apiError(e.code || 'internal_error', e.message || err.message))
  }
};

// Handle Punch IN for barcode
async function handlePunchInBarcode(emp, now, currentTimeString, res, attendanceIso = null, existingAttendance = null) {
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
      
      // Check for continuous IN across configured boundary (e.g., 7AM)
      await attendanceService.handleContinuousINAcross8AM(emp._id, attendanceIso, Attendance);

      await emp.populate('headDepartment');
      await emp.populate('subDepartment');
      await emp.populate('designation');

      // Recalculate salary for current month
      salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
        console.error('Salary recalculation failed:', err)
      );

      // Update monthly summary and emit socket update with summary
      try {
        const attDate = existingAttendance.date ? new Date(existingAttendance.date) : new Date();
        const year = attDate.getFullYear();
        const month = attDate.getMonth() + 1;
        const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00Z`);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const attsForMonth = await Attendance.find({ employee: emp._id, date: { $gte: start, $lt: end } }).lean();
        const days = (function(y, m){ const d = new Date(y, m, 0).getDate(); return new Array(d).fill(0).map((_,i)=> ({ date: String(i+1).padStart(2,'0'), iso: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, day: ''})); })(year, month);
        await updateMonthlySummary(emp._id, year, month, attsForMonth, days, emp.joiningDate);
        const updatedSummary = await MonthlySummary.findOne({ employee: emp._id, year, month }).lean();
        try { const io = getIO(); if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: existingAttendance, type: 'in', summary: updatedSummary }); } catch(e){ console.warn('Socket emit failed', e && e.message ? e.message : e); }
      } catch (e) {
        console.warn('Failed to update monthly summary (barcode IN existing):', e && e.message ? e.message : e);
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
    
    // Check for continuous IN across configured boundary (e.g., 7AM)
    await attendanceService.handleContinuousINAcross8AM(emp._id, dateIso, Attendance);

    // Re-populate employee relations for response
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('designation');

    // Recalculate salary for current month
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
      console.error('Salary recalculation failed:', err)
    );

    // Update monthly summary and emit socket update with summary
    try {
      const attDate = newAttendanceDoc.date ? new Date(newAttendanceDoc.date) : new Date();
      const year = attDate.getFullYear();
      const month = attDate.getMonth() + 1;
      const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const attsForMonth = await Attendance.find({ employee: emp._id, date: { $gte: start, $lt: end } }).lean();
      const days = (function(y, m){ const d = new Date(y, m, 0).getDate(); return new Array(d).fill(0).map((_,i)=> ({ date: String(i+1).padStart(2,'0'), iso: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, day: ''})); })(year, month);
      await updateMonthlySummary(emp._id, year, month, attsForMonth, days, emp.joiningDate);
      const updatedSummary = await MonthlySummary.findOne({ employee: emp._id, year, month }).lean();
      try { const io = getIO(); if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance: newAttendanceDoc, type: 'in', summary: updatedSummary }); } catch(e){ console.warn('Socket emit failed', e && e.message ? e.message : e); }
    } catch (e) {
      console.warn('Failed to update monthly summary (barcode IN new):', e && e.message ? e.message : e);
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

// Handle Punch OUT for barcode
async function handlePunchOutBarcode(emp, attendanceDoc, now, currentTimeString, res) {
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

    // Re-populate employee relations for response
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('designation');

    // Recalculate salary for current month
    salaryRecalcService.recalculateCurrentAndPreviousMonth().catch(err => 
      console.error('Salary recalculation failed:', err)
    );

    // Update monthly summary and emit socket update with summary
    try {
      const attDate = attendance.date ? new Date(attendance.date) : new Date();
      const year = attDate.getFullYear();
      const month = attDate.getMonth() + 1;
      const start = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const attsForMonth = await Attendance.find({ employee: emp._id, date: { $gte: start, $lt: end } }).lean();
      const days = (function(y, m){ const d = new Date(y, m, 0).getDate(); return new Array(d).fill(0).map((_,i)=> ({ date: String(i+1).padStart(2,'0'), iso: `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`, day: ''})); })(year, month);
      await updateMonthlySummary(emp._id, year, month, attsForMonth, days, emp.joiningDate);
      const updatedSummary = await MonthlySummary.findOne({ employee: emp._id, year, month }).lean();
      try { const io = getIO(); if (io) io.emit('attendance:updated', { employee: emp._id.toString(), attendance, type: 'out', summary: updatedSummary }); } catch(e){ console.warn('Socket emit failed', e && e.message ? e.message : e); }
    } catch (e) {
      console.warn('Failed to update monthly summary (barcode OUT):', e && e.message ? e.message : e);
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
};
