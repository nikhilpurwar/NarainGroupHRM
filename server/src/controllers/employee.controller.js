import Employee from "../models/employee.model.js";
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
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const emps = await Employee.find().sort({ createdAt: -1 });
    res.json({ success: true, data: emps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
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
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    // push attendance record
    emp.attendance.push({ date, status: status || "present", inTime, outTime, note });
    await emp.save();
    res.json({ success: true, data: emp.attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id, { attendance: 1 });
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, data: emp.attendance });
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
    const emp = await Employee.findById(req.params.id);
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
