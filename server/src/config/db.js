import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB Database Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Database Connection Failed:", error);
    process.exit(1);
  }
};

export default connectDB;
