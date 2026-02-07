import axios from 'axios';
const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Read env variable directly to avoid module caching issues
const getAIBase = () => {
  const url = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  console.log('AI_SERVICE_URL from env:', process.env.AI_SERVICE_URL);
  console.log('Using AI service at:', url);
  return url;
};

export async function enrollEmployee(employeeId, images = [], options = {}) {
  const AI_BASE = getAIBase();
  const url = `${AI_BASE}/enroll`;
  const body = { employeeId, images, ...options };
  const resp = await axios.post(url, body, { timeout: 120_000 });
  return resp.data;
}

export async function recognizeImage(image, topK = 1) {
  const AI_BASE = getAIBase();
  const url = `${AI_BASE}/recognize`;
  const body = { image, topK };
  const resp = await axios.post(url, body, { timeout: 15_000 });
  // Python service now returns { success: true, embedding: [...] }
  // Node will do the DB matching in the recognizeFace controller
  return resp.data;
}

export default { enrollEmployee, recognizeImage };
