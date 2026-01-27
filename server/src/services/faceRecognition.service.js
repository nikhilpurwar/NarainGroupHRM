import axios from 'axios';

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://127.0.0.1:5001';

export const extractEmbedding = async (base64Image) => {
  try {
    const response = await axios.post(`${FACE_SERVICE_URL}/extract-embedding`, {
      image: base64Image
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    return response.data;
  } catch (error) {
    throw new Error(`Face service error: ${error.response?.data?.message || error.message}`);
  }
};

export const compareFaces = async (embedding1, embedding2) => {
  try {
    const response = await axios.post(`${FACE_SERVICE_URL}/compare-faces`, {
      embedding1,
      embedding2
    });
    
    return response.data;
  } catch (error) {
    throw new Error(`Face comparison error: ${error.response?.data?.message || error.message}`);
  }
};

export const healthCheck = async () => {
  try {
    const response = await axios.get(`${FACE_SERVICE_URL}/health`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Face service health check failed:', error.message);
    return { status: 'unhealthy', error: error.message };
  }
};