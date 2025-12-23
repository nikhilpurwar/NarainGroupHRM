import express from "express";
const app = express();
import helmet from "helmet"
import cors from "cors";
import path from 'path'

// CORS configuration: allow all in development, restrict in production via CORS_ORIGINS env
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const allowAllCors = corsOrigins.includes('*') || corsOrigins.length === 0

// corsOptionsDelegate supports:
// - empty origin (non-browser requests) => allow
// - exact origin match
// - wildcard entries like '*.example.com'
// - '*' to allow all
const corsOptionsDelegate = function (req, callback) {
	const origin = req.header('Origin')
	if (!origin) {
		// allow non-browser or same-host requests
		return callback(null, { origin: true, credentials: true })
	}
	if (allowAllCors) {
		return callback(null, { origin: true, credentials: true })
	}
	const allowed = corsOrigins.some(o => {
		if (!o) return false
		if (o === origin) return true
		if (o.startsWith('*.')) {
			const domain = o.slice(2)
			return origin.endsWith(domain)
		}
		return false
	})
	if (allowed) return callback(null, { origin: true, credentials: true })
	return callback(null, { origin: false })
}

app.use(cors(corsOptionsDelegate))

// importing routes 
import authRoutes from "./src/routes/auth.route.js";
import employeeRoutes from "./src/routes/employee.route.js";

// department imports
import departmentRoutes from "./src/routes/department.route.js";

// setting imports
import holidayRoutes from "./src/routes/settings/holiday.route.js";
import chargeRoutes from "./src/routes/settings/charge.route.js";
import breakRoutes from "./src/routes/settings/breaktime.route.js";
import userRoutes from "./src/routes/settings/user.route.js";

// attendance imports
import attendanceRoutes from "./src/routes/attendance.route.js";
import advanceRoutes from "./src/routes/advance.route.js";

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
app.use("/api/department", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance-report", attendanceRoutes);
// Barcode attendance - also available at direct /api/store-emp-attend path
app.use("/api", attendanceRoutes);
// Advances (loans/advances)
app.use("/api/advance", advanceRoutes);

// Serve client in production if built
if (process.env.NODE_ENV === 'production') {
	const clientBuildPath = path.join(process.cwd(), 'client', 'dist')
	app.use(express.static(clientBuildPath))
	// SPA fallback: serve index.html for all non-API routes
	// This must be AFTER all other routes, so React Router can handle navigation
	app.use((req, res, next) => {
		// Don't serve index.html for API requests that weren't caught by routes
		if (req.path.startsWith('/api')) {
			res.status(404).json({ success: false, message: 'API endpoint not found' })
			return
		}
		res.sendFile(path.join(clientBuildPath, 'index.html'))
	})
}

export default app;