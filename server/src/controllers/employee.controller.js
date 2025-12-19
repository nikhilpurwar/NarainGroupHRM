import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import * as attendanceService from "../services/attendance.service.js";
import { apiError, handleMongooseError } from "../utils/error.util.js";
import bwipjs from "bwip-js";
import QRCode from "qrcode";

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
    if (!date) return res.status(400).json({ success: false, message: "date is required" });

    const emp = await Employee.findById(req.params.id)
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('designation');

    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

    // Check for duplicate attendance on same date in Attendance collection
    const dateObj = new Date(date);
    const dateIso = dateObj.toISOString().slice(0, 10);

    const existingAttendance = await Attendance.findOne({ employee: emp._id, date: {
      $gte: new Date(`${dateIso}T00:00:00Z`),
      $lte: new Date(`${dateIso}T23:59:59Z`)
    } });

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
