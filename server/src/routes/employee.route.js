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
} from "../controllers/employee.controller.js";

const router = express.Router();

router.post("/", createEmployee);
router.get("/", getEmployees);
router.get("/barcodes", getBarcodes);
router.get("/qrcodes", getQRCodes);
router.get("/:id", getEmployeeById);
router.get("/:id/profile", getEmployeeProfile);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);
router.post("/:id/attendance", addAttendance);
router.get("/:id/attendance", getAttendance);

export default router;
