import express from "express";
import {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holiday.controller.js";

const router = express.Router();

router.post("/", createHoliday);   
router.get("/", getHolidays);     
router.get("/:id", getHolidayById);     
router.put("/:id", updateHoliday);    
router.delete("/:id", deleteHoliday);  

export default router;
