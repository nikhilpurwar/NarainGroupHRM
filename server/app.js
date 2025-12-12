import express from "express";
const app = express();
import helmet from "helmet"
import cors from "cors";

// Allow all origins
app.use(cors());

// importing routes 
import holidayRoutes from "./src/routes/holiday.route.js";

// Security
app.use(helmet());

// middleware to parse json
app.use(express.json());

app.use("/api/holidays", holidayRoutes);

export default app;