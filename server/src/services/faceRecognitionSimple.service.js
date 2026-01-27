import sharp from 'sharp';

class FaceRecognitionService {
  constructor() {
    this.isInitialized = true;
  }

  async initialize() {
    console.log('Simple face recognition service initialized');
  }

  async extractFaceDescriptor(imageBuffer) {
    try {
      // Simple implementation: create a hash-based descriptor from image
      const metadata = await sharp(imageBuffer).metadata();
      const { data } = await sharp(imageBuffer)
        .resize(128, 128)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Create a simple 128-dimensional descriptor from image data
      const descriptor = new Array(128);
      for (let i = 0; i < 128; i++) {
        descriptor[i] = data[i * Math.floor(data.length / 128)] / 255;
      }
      
      return descriptor;
    } catch (error) {
      throw new Error('No face detected in the image');
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