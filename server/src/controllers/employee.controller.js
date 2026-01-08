import Employee from "../models/employee.model.js";
import User from "../models/setting.model/user.model.js";
import Attendance from "../models/attendance.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
import salaryRecalcService from "../services/salaryRecalculation.service.js";
import { getSalaryRuleForSubDepartment } from "../services/salary.service.js";
import bwipjs from "bwip-js";
import QRCode from "qrcode";

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
      if (role !== 'Admin') {
        const requesterEmail = requester?.email
        // Allow if user's email matches employee.empId or employee.email
        if (!requesterEmail || (emp.empId !== requesterEmail && emp.email !== requesterEmail)) {
          return res.status(403).json({ success: false, message: 'Forbidden' })
        }
      }
    } catch (e) {
      // if user lookup fails, deny access for non-admins
      if (!(req.user && req.user.role === 'Admin')) return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addAttendance = async (req, res) => {
  try {
    const { date, status, inTime, outTime, note } = req.body;

    const emp = await Employee.findById(req.params.id)
      .populate('headDepartment', 'name')
      .populate('subDepartment', 'name')
      .populate('designation', 'name');

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
    const inPunch = capturedInTime ? attendanceService.parseDateTime(dateIso, capturedInTime) : null
    let outPunch = outTime ? attendanceService.parseDateTime(dateIso, outTime) : null

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
      if (role !== 'Admin') {
        const requesterEmail = requester?.email
        if (!requesterEmail || (emp.empId !== requesterEmail && emp.email !== requesterEmail)) {
          return res.status(403).json({ success: false, message: 'Forbidden' })
        }
      }
    } catch (e) {
      if (!(req.user && req.user.role === 'Admin')) return res.status(403).json({ success: false, message: 'Forbidden' })
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
      if (emp.status && emp.status.toString().toLowerCase() !== 'active' && requesterRole !== 'Admin') {
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
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
