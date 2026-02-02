import multer from "multer";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dlqigmtmu',
  api_key: '188838391927824',
  api_secret: 'QChw4ahvV-oz7tGHiA-kH4c0J5g'
});

// Custom multer storage using direct Cloudinary SDK
const storage = multer.memoryStorage();

const uploadToCloudinary = async (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'vehicle-documents',
        resource_type: 'raw',
        public_id: `vehicle_${Date.now()}_${originalname.split('.')[0]}`,
        format: 'pdf'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
};

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files allowed"), false);
  }
};

export const uploadVehiclePdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export { uploadToCloudinary };
