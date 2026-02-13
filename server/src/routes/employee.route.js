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
  recognitionFeedback,
  confirmRecognition,
  validateFaceCache,
} from "../controllers/employee.controller.js";
import { authenticate, checkUserActive } from "../middleware/auth.middleware.js";
import { checkPermission } from "../middleware/permission.middleware.js";
import { uploadVehiclePdf } from "../middleware/uploadVehiclePdf.js";

const router = express.Router();

router.post("/", authenticate, checkUserActive, checkPermission, uploadVehiclePdf.single("vehicleDocument"), createEmployee);
router.get("/", authenticate, checkUserActive, checkPermission, getEmployees);
router.get("/barcodes", authenticate, checkUserActive, checkPermission, getBarcodes);
router.get("/qrcodes", authenticate, checkUserActive, checkPermission, getQRCodes);
router.get("/face-recognition", getEmployeesForFaceRecognition); // Get employees with face data
router.get("/face/test", testFaceService); // Test face service
router.post("/face/test", testFaceService); // Test face service
router.post("/validate-face-cache", validateFaceCache); // Validate mobile cache against DB
router.post("/enroll-face", enrollFace); // Enroll face embedding
router.post("/recognize-face", recognizeFace); // Recognize face from embedding
router.post("/face-attendance", faceAttendance); // Face attendance endpoint
router.post("/recognition-feedback", recognitionFeedback); // Feedback from mobile about recognition accuracy
router.post("/confirm-recognition", confirmRecognition); // Client-confirmed recognition -> update template
router.get("/attendance/barcode", addAttendance); // For barcode scanner GET
router.post("/attendance/barcode", addAttendance); // For barcode scanner POST
router.get("/:id", authenticate, checkUserActive, getEmployeeById);
router.get("/:id/profile", authenticate, checkUserActive, getEmployeeProfile);
router.put("/:id", authenticate, checkUserActive, checkPermission, uploadVehiclePdf.single("vehicleDocument"), updateEmployee);
router.delete("/:id", authenticate, checkUserActive, checkPermission, deleteEmployee);
router.post("/:id/attendance", authenticate, checkUserActive, addAttendance);
router.get("/:id/attendance", authenticate, checkUserActive, getAttendance);

export default router;
