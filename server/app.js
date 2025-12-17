import express from "express";
const app = express();
import helmet from "helmet"
import cors from "cors";
import path from 'path'

// CORS configuration: allow all in development, restrict in production via CORS_ORIGINS env
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
if (corsOrigins.length) {
	app.use(cors({
		origin: function(origin, cb) {
			// allow non-browser requests (e.g., server-to-server) when origin is undefined
			if (!origin) return cb(null, true)
			if (corsOrigins.indexOf(origin) !== -1) return cb(null, true)
			return cb(new Error('Not allowed by CORS'))
		}
	}))
} else {
	app.use(cors())
}

// importing routes 
import holidayRoutes from "./src/routes/holiday.route.js";
import employeeRoutes from "./src/routes/employee.route.js";
import chargeRoutes from "./src/routes/charge.route.js";
import breakRoutes from "./src/routes/breaktime.route.js";
import authRoutes from "./src/routes/auth.route.js";
import userRoutes from "./src/routes/user.route.js";
import settingRoutes from "./src/routes/setting.route.js";
import attendanceRoutes from "./src/routes/attendance.route.js";

// Security
app.use(helmet());

// middleware to parse json with increased limits for file uploads (avatars, barcodes, QR)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/holidays", holidayRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/charges", chargeRoutes);
app.use("/api/break-times", breakRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance-report", attendanceRoutes);
// Barcode attendance - also available at direct /api/store-emp-attend path
app.use("/api", attendanceRoutes);

// Serve client in production if built
if (process.env.NODE_ENV === 'production') {
	const clientBuildPath = path.join(process.cwd(), 'client', 'dist')
	app.use(express.static(clientBuildPath))
	app.get('*', (req, res) => {
		res.sendFile(path.join(clientBuildPath, 'index.html'))
	})
}

export default app;