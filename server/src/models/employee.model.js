import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, enum: ["present", "absent"], default: "absent" },
  inTime: { type: String }, // HH:mm:ss format
  outTime: { type: String }, // HH:mm:ss format
  totalHours: { type: Number, default: 0 }, // Total hours worked
  regularHours: { type: Number, default: 0 }, // Regular shift hours
  overtimeHours: { type: Number, default: 0 }, // Overtime hours (if any)
  breakMinutes: { type: Number, default: 0 }, // Break duration in minutes
  isWeekend: { type: Boolean, default: false }, // Sunday/Saturday flag
  isHoliday: { type: Boolean, default: false }, // Holiday flag
  punchLogs: [{ // Track individual punches for detailed records
    punchType: { type: String, enum: ["IN", "OUT"], required: true },
    punchTime: { type: Date, required: true },
    _id: false
  }],
  note: { type: String }
}, { _id: false });

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fatherName: { type: String },
    motherName: { type: String },
    email: { type: String },
    mobile: { type: String },
    address: { type: String },
    pincode: { type: String },
    gender: { type: String },
    maritalStatus: { type: String },
    salary: { type: Number },
    empType: { type: String },
    shift: { type: String },
    headDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'HeadDepartment' },
    subDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'SubDepartment' },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
    deductions: [{ type: String }],
    empId: { type: String, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    avatar: { type: String }, // store base64 data URL or file path
    barcode: { type: String }, // base64 image or svg
    qrCode: { type: String }, // base64 image or svg
    // Attendance moved to separate collection `Attendance` linked by employee id
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
