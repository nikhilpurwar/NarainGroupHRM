import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  addAttendance,
  getAttendance,
  getBarcodes,
  getQRCodes,
  getEmployeeProfile,
  getEmployeesForFaceRecognition,
  faceAttendance,
  enrollFace,
  recognizeFace,
  testFaceService,
} from "../controllers/employee.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { checkPermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.post("/", authenticate, checkPermission, createEmployee);
router.get("/", authenticate, checkPermission, getEmployees);
router.get("/barcodes", authenticate, checkPermission, getBarcodes);
router.get("/qrcodes", authenticate, checkPermission, getQRCodes);
router.get("/face-recognition", getEmployeesForFaceRecognition); // Get employees with face data
router.get("/face/test", testFaceService); // Test face service
router.post("/face/test", testFaceService); // Test face service
router.post("/enroll-face", enrollFace); // Enroll face embedding
router.post("/recognize-face", recognizeFace); // Recognize face from embedding
router.post("/face-attendance", faceAttendance); // Face attendance endpoint
router.get("/attendance/barcode", addAttendance); // For barcode scanner GET
router.post("/attendance/barcode", addAttendance); // For barcode scanner POST
router.get("/:id", authenticate, getEmployeeById);
router.get("/:id/profile", authenticate, getEmployeeProfile);
router.put("/:id", authenticate, checkPermission, updateEmployee);
router.delete("/:id", authenticate, checkPermission, deleteEmployee);
router.post("/:id/attendance", authenticate, addAttendance);
router.get("/:id/attendance", authenticate, getAttendance);

export default router;
