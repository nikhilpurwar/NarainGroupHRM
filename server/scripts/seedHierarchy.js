import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { HeadDepartment, SubDepartment, Group, Designation } from "../src/models/department.model.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

const seedHierarchy = async () => {
  try {
    // Clear existing data
    await Group.deleteMany({});
    await Designation.deleteMany({});
    await HeadDepartment.deleteMany({});
    await SubDepartment.deleteMany({});

    console.log("🗑️  Cleared existing data...");

    // ============ GROUPS ============
    const groups = await Group.insertMany([
      // PLANT SECTION
      { name: "Group A - Head Level", code: "GA_HEAD", section: "PLANT", hierarchy: 0 },
      { name: "Group B - Foreman Level", code: "GB_FOREMAN", section: "PLANT", hierarchy: 1 },
      { name: "Group C - Management", code: "GC_MGMT", section: "PLANT", hierarchy: 1 },
      { name: "Group D - Operational", code: "GD_OPS", section: "PLANT", hierarchy: 2 },
      { name: "Group E - Support", code: "GE_SUPPORT", section: "PLANT", hierarchy: 2 },
      // OFFICE SECTION
      { name: "Office Group B - Senior", code: "OB_SENIOR", section: "OFFICE", hierarchy: 1 },
      { name: "Office Group A - Staff", code: "OA_STAFF", section: "OFFICE", hierarchy: 2 },
      // FINISH SECTION
      { name: "Finish - Supervisor", code: "FS_SUPER", section: "FINISH", hierarchy: 1 },
      { name: "Finish - Labour", code: "FL_LABOUR", section: "FINISH", hierarchy: 2 },
    ]);
    console.log("✅ Groups created:", groups.length);

    // ============ DESIGNATIONS ============
    const designations = await Designation.insertMany([
      // PLANT - Group A
      { name: "Plant Head", code: "DES_PH", group: groups[0]._id, shiftHours: 8, description: "Head of plant operations" },
      { name: "Unit Head", code: "DES_UH", group: groups[0]._id, shiftHours: 8, description: "Head of unit" },

      // PLANT - Group B
      { name: "Senior Foreman", code: "DES_SF", group: groups[1]._id, reportsToDesignation: null, shiftHours: 8 },
      { name: "Foreman", code: "DES_FM", group: groups[1]._id, shiftHours: 8 },
      { name: "Shift Foreman", code: "DES_SHFM", group: groups[1]._id, shiftHours: 8 },

      // PLANT - Group C
      { name: "Production Manager", code: "DES_PM", group: groups[2]._id, shiftHours: 8 },
      { name: "Maintenance Manager", code: "DES_MM", group: groups[2]._id, shiftHours: 8 },
      { name: "Quality / Process Manager", code: "DES_QM", group: groups[2]._id, shiftHours: 8 },

      // PLANT - Group D
      { name: "Senior Operator", code: "DES_SO", group: groups[3]._id, shiftHours: 8 },
      { name: "Machine Operator", code: "DES_MO", group: groups[3]._id, shiftHours: 8 },
      { name: "Technician", code: "DES_TEC", group: groups[3]._id, shiftHours: 8 },
      { name: "Helper / Worker", code: "DES_HELP", group: groups[3]._id, shiftHours: 8 },

      // PLANT - Group E
      { name: "Driver", code: "DES_DRV", group: groups[4]._id, shiftHours: 8 },

      // OFFICE - Group B
      { name: "Admin Head", code: "DES_AH", group: groups[5]._id, shiftHours: 8 },
      { name: "HR Manager", code: "DES_HR", group: groups[5]._id, shiftHours: 8 },
      { name: "Accounts Head", code: "DES_ACH", group: groups[5]._id, shiftHours: 8 },

      // OFFICE - Group A
      { name: "Accountant", code: "DES_ACC", group: groups[6]._id, shiftHours: 8 },
      { name: "Clerk", code: "DES_CLK", group: groups[6]._id, shiftHours: 8 },
      { name: "Data Entry Operator", code: "DES_DEO", group: groups[6]._id, shiftHours: 8 },
      { name: "Office Assistant", code: "DES_OA", group: groups[6]._id, shiftHours: 8 },

      // FINISH
      { name: "Finish Supervisor", code: "DES_FS", group: groups[7]._id, shiftHours: 10 },
      { name: "Senior Finisher", code: "DES_SFINISH", group: groups[8]._id, shiftHours: 10 },
      { name: "Finishing Operator", code: "DES_FOPER", group: groups[8]._id, shiftHours: 10 },
      { name: "Helper", code: "DES_FHELP", group: groups[8]._id, shiftHours: 10 },
    ]);
    console.log("✅ Designations created:", designations.length);

    // ============ HEAD DEPARTMENTS ============
    const headDepts = await HeadDepartment.insertMany([
      { name: "Plant Operations", code: "DEPT_PLANT", hierarchy: 1, description: "8-hour shift operations" },
      { name: "Office & Admin", code: "DEPT_OFFICE", hierarchy: 1, description: "8-hour office operations" },
      { name: "Finishing", code: "DEPT_FINISH", hierarchy: 2, description: "10-hour shift with OT" },
    ]);
    console.log("✅ Head Departments created:", headDepts.length);

    // ============ SUB DEPARTMENTS ============
    const subDepts = await SubDepartment.insertMany([
      // PLANT Operations
      { name: "Production", code: "SUBDEPT_PROD", headDepartment: headDepts[0]._id, reportsTo: headDepts[0]._id },
      { name: "Maintenance", code: "SUBDEPT_MAINT", headDepartment: headDepts[0]._id, reportsTo: headDepts[0]._id },
      { name: "Quality Control", code: "SUBDEPT_QC", headDepartment: headDepts[0]._id, reportsTo: headDepts[0]._id },
      { name: "Logistics", code: "SUBDEPT_LOG", headDepartment: headDepts[0]._id, reportsTo: headDepts[0]._id },

      // OFFICE
      { name: "Human Resources", code: "SUBDEPT_HR", headDepartment: headDepts[1]._id, reportsTo: headDepts[1]._id },
      { name: "Accounts", code: "SUBDEPT_ACC", headDepartment: headDepts[1]._id, reportsTo: headDepts[1]._id },
      { name: "Administration", code: "SUBDEPT_ADMIN", headDepartment: headDepts[1]._id, reportsTo: headDepts[1]._id },

      // FINISHING
      { name: "Finishing Operations", code: "SUBDEPT_FINISH", headDepartment: headDepts[2]._id, reportsTo: headDepts[2]._id },
    ]);
    console.log("✅ Sub Departments created:", subDepts.length);

    console.log("\n✅ Hierarchy seed completed successfully!");
    console.log("\nCreated:");
    console.log(`  - ${groups.length} Groups`);
    console.log(`  - ${designations.length} Designations`);
    console.log(`  - ${headDepts.length} Head Departments`);
    console.log(`  - ${subDepts.length} Sub Departments`);
  } catch (error) {
    console.error("❌ Error seeding hierarchy:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
};

connectDB().then(() => seedHierarchy());
