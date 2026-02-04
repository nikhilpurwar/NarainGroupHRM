import axios from 'axios';

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function enrollEmployee(employeeId, images = [], options = {}) {
  const url = `${AI_BASE}/enroll`;
  const body = { employeeId, images, ...options };
  const resp = await axios.post(url, body, { timeout: 120_000 });
  return resp.data;
}

export async function recognizeImage(image, topK = 1) {
  const url = `${AI_BASE}/recognize`;
  const body = { image, topK };
  const resp = await axios.post(url, body, { timeout: 15_000 });
  return resp.data;
}

export default { enrollEmployee, recognizeImage };
