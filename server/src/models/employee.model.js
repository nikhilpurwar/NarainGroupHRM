import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, enum: ["present", "absent"], default: "absent" },
  inTime: { type: String },
  outTime: { type: String },
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
    workHours: { type: String },
    salaryPerHour: { type: Number },
    empType: { type: String },
    shift: { type: String },
    headDepartment: { type: String },
    subDepartment: { type: String },
    group: { type: String },
    deductions: [{ type: String }],
    empId: { type: String, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    avatar: { type: String }, // store base64 data URL or file path
    barcode: { type: String }, // base64 image or svg
    qrCode: { type: String }, // base64 image or svg
    attendance: [attendanceSchema]
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
