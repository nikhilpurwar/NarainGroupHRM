import express from "express";
import {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
} from "../../controllers/setting.controller/holiday.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/permission.middleware.js";

const router = express.Router();

router.post("/", authenticate, checkPermission, createHoliday);   
router.get("/", authenticate, checkPermission, getHolidays);     
router.get("/:id", authenticate, checkPermission, getHolidayById);     
router.put("/:id", authenticate, checkPermission, updateHoliday);    
router.delete("/:id", deleteHoliday);  

export default router;
