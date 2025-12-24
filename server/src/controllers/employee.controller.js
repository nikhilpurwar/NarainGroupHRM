import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
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
    res.status(201).json({ success: true, data: emp });
  } catch (err) {
    const { apiError: apiErr, handleMongooseError } = await import('../utils/error.util.js')
      .then(m => ({ apiError: m.apiError, handleMongooseError: m.handleMongooseError }))
      .catch(() => ({}))
    if (handleMongooseError) {
      const e = handleMongooseError(err)
      return res.status(e.status || 500).json(apiErr(e.code || 'internal_error', e.message || err.message))
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const emps = await Employee.find()
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: emps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id)
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation');
    if (!emp) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addAttendance = async (req, res) => {
  try {
    const { date, status, inTime, outTime, note } = req.body;

    const emp = await Employee.findById(req.params.id)
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation');

    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

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
          const shiftCfg = await attendanceService.getShiftConfig();
          const shiftHours = emp.workHours || emp.shift || shiftCfg.shiftHours || 8;
          const computed = attendanceService.computeTotalsFromPunchLogs(attendanceDoc.punchLogs, shiftHours);
          attendanceDoc.totalHours = computed.totalHours;
          attendanceDoc.regularHours = computed.regularHours;
          attendanceDoc.overtimeHours = computed.overtimeHours;
          attendanceDoc.totalMinutes = computed.totalMinutes;
          attendanceDoc.totalHoursDisplay = computed.totalHoursDisplay;
          attendanceDoc.regularHoursDisplay = computed.regularHoursDisplay;
          attendanceDoc.overtimeHoursDisplay = computed.overtimeHoursDisplay;
          attendanceDoc.inTime = computed.lastInTime ? new Date(computed.lastInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendanceDoc.inTime;
          attendanceDoc.outTime = computed.lastOutTime ? new Date(computed.lastOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : attendanceDoc.outTime;
          // attendanceDoc.note = `Punch OUT via manual toggle | Total: ${computed.totalHours}h | Regular: ${computed.regularHours}h | OT: ${computed.overtimeHours}h`;
          attendanceDoc.note = `Punch OUT via manual toggle`;

          await attendanceDoc.save();

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
          const shiftCfg2 = await attendanceService.getShiftConfig();
          const shiftHours2 = emp.workHours || emp.shift || shiftCfg2.shiftHours || 8;
          const computed = attendanceService.computeTotalsFromPunchLogs(attendanceDoc.punchLogs, shiftHours2);
          attendanceDoc.totalHours = computed.totalHours;
          attendanceDoc.regularHours = computed.regularHours;
          attendanceDoc.overtimeHours = computed.overtimeHours;
          attendanceDoc.totalMinutes = computed.totalMinutes;
          attendanceDoc.totalHoursDisplay = computed.totalHoursDisplay;
          attendanceDoc.regularHoursDisplay = computed.regularHoursDisplay;
          attendanceDoc.overtimeHoursDisplay = computed.overtimeHoursDisplay;
          await attendanceDoc.save();

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
      const dayOfWeek2 = dateObj.getDay();
      const isWeekend2 = dayOfWeek2 === 0 || dayOfWeek2 === 6;
      const newAtt = await Attendance.create({ employee: emp._id, date: dateObj, status: 'present', inTime: currentTimeString, outTime: null, totalHours: 0, regularHours: 0, overtimeHours: 0, totalMinutes: 0, totalHoursDisplay: '0h 0m', regularHoursDisplay: '0h 0m', overtimeHoursDisplay: '0h 0m', breakMinutes: 0, isWeekend: isWeekend2, isHoliday: false, punchLogs: [{ punchType: 'IN', punchTime: now }], note: 'Punch IN via manual toggle' });

      // Record punch in debounce cache
      attendanceService.recordPunch(emp._id.toString(), 'IN');

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

    // Calculate hours if both inTime and outTime provided
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;

    if (capturedInTime && outTime) {
      const [inHours, inMinutes] = capturedInTime.split(':').map(Number);
      const [outHours, outMinutes] = outTime.split(':').map(Number);

      const inTotalMinutes = inHours * 60 + inMinutes;
      const outTotalMinutes = outHours * 60 + outMinutes;

      let totalMinutes = outTotalMinutes - inTotalMinutes;

      // Handle day boundary
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
      }

      totalHours = parseFloat((totalMinutes / 60).toFixed(2));
      const shiftHours = emp.shift ? parseInt(emp.shift) : 8;
      if (totalHours <= shiftHours) {
        regularHours = totalHours;
        overtimeHours = 0;
      } else {
        regularHours = shiftHours;
        overtimeHours = parseFloat((totalHours - shiftHours).toFixed(2));
      }
    }

    // Check for weekend
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Create Attendance document (use model static helper)
    // build punch log timestamps using service helper
    const inPunch = capturedInTime ? attendanceService.parseDateTime(dateIso, capturedInTime) : null
    const outPunch = outTime ? attendanceService.parseDateTime(dateIso, outTime) : null

    const att = await Attendance.safeCreate({
      employee: emp._id,
      date: new Date(date),
      status: status || 'present',
      inTime: capturedInTime,
      outTime,
      totalHours,
      totalMinutes: inPunch && outPunch ? Math.round((outPunch - inPunch) / 60000) : 0,
      regularHours,
      overtimeHours,
      breakMinutes: 0,
      isWeekend,
      isHoliday: false,
      punchLogs: [
        ...(inPunch ? [{ punchType: 'IN', punchTime: inPunch }] : []),
        ...(outPunch ? [{ punchType: 'OUT', punchTime: outPunch }] : [])
      ],
      note: note || 'Marked manually'
    });

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
    const records = await Attendance.find({ employee: emp._id }).sort({ date: 1 });
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
    res.json({ success: true, data: emp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: "Not found" });
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
