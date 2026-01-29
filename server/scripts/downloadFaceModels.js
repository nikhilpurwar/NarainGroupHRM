const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_URLS = {
  'ssd_mobilenetv1_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1',
  'face_recognition_model-shard2': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
};

const downloadFile = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
};

async function downloadModels() {
  const modelsDir = path.join(__dirname, '../models');
  
  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }
  
  console.log('Downloading face recognition models...');
  
  for (const [filename, url] of Object.entries(MODEL_URLS)) {
    const filepath = path.join(modelsDir, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`Skipping existing file: ${filename}`);
      continue;
    }
    
    try {
      await downloadFile(url, filepath);
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error.message);
    }
  }
  
  console.log('Model download complete!');
}

if (require.main === module) {
  downloadModels().catch(console.error);
}

module.exports = downloadModels;