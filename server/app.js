import express from "express";
const app = express();
import helmet from "helmet"
import cors from "cors";

// Allow all origins
app.use(cors());

// importing routes 
import holidayRoutes from "./src/routes/holiday.route.js";
import employeeRoutes from "./src/routes/employee.route.js";

// Security
app.use(helmet());

// middleware to parse json with increased limits for file uploads (avatars, barcodes, QR)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/holidays", holidayRoutes);
app.use("/api/employees", employeeRoutes);

export default app;