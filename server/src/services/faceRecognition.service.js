import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patch face-api.js to work with Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class FaceRecognitionService {
  constructor() {
    this.isInitialized = false;
    this.modelsPath = path.join(__dirname, '../../models');
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create models directory if it doesn't exist
      if (!fs.existsSync(this.modelsPath)) {
        fs.mkdirSync(this.modelsPath, { recursive: true });
      }

      // Load models
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath);

      this.isInitialized = true;
      console.log('Face recognition models loaded successfully');
    } catch (error) {
      console.error('Error loading face recognition models:', error);
      throw error;
    }
  }

  async extractFaceDescriptor(imageBuffer) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const img = new Image();
      img.src = imageBuffer;

      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        throw new Error('No face detected in the image');
      }

      return Array.from(detections.descriptor);
    } catch (error) {
      console.error('Error extracting face descriptor:', error);
      throw error;
    }
  }

  calculateDistance(descriptor1, descriptor2) {
    if (descriptor1.length !== descriptor2.length) {
      throw new Error('Descriptors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
    }
    return Math.sqrt(sum);
  }

  compareFaces(descriptor1, descriptor2, threshold = 0.6) {
    const distance = this.calculateDistance(descriptor1, descriptor2);
    return {
      distance,
      match: distance < threshold,
      confidence: Math.max(0, 1 - distance)
    };
  }

  findBestMatch(targetDescriptor, knownDescriptors, threshold = 0.6) {
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const known of knownDescriptors) {
      const distance = this.calculateDistance(targetDescriptor, known.descriptor);
      if (distance < bestDistance && distance < threshold) {
        bestDistance = distance;
        bestMatch = {
          ...known,
          distance,
          confidence: Math.max(0, 1 - distance)
        };
      }
    }

    return bestMatch;
  }
}

export default new FaceRecognitionService();