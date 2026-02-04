import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fatherName: { type: String },
    motherName: { type: String },
    email: { 
        type: String,
        validate: {
            validator: function(v) { return !v || /^\S+@\S+\.\S+$/.test(v); },
            message: 'Invalid email format'
        }
    },
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
    vehicleInfo: {
    vehicleNumber: { type: String },
    vehicleName: { type: String },
    vehicleDocument: { type: String }, // base64 PDF or file path
    insuranceExpiry: Date, 
  },
    // Face recognition fields - ONE STRONG TEMPLATE
    faceTemplate: {
        type: [Number],
        validate: {
            validator: function(v) { 
                return !v || v.length === 0 || (Array.isArray(v) && v.length === 128); 
            },
            message: 'Face template must be a 128-dimensional vector'
        }
    },
    faceTemplateCount: { type: Number, default: 0 },
    faceTemplateLastUpdated: { type: Date },
    faceEnrolled: { type: Boolean, default: false },
    faceEnrollmentDate: { type: Date },
    embeddingVersion: { type: String, default: 'v1' },
}, { timestamps: true });

// Ensure unique empId at the database level. Use sparse to allow documents
// without empId to coexist (pre-existing records) — remove sparse if you
// want to enforce uniqueness for all documents.
employeeSchema.index({ empId: 1 }, { unique: true, sparse: true });
// Ensure unique email when provided. Use sparse so documents without email are allowed.
employeeSchema.index({ email: 1 }, { unique: true, sparse: true });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
