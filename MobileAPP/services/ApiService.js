import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/apiConfig';

class ApiService {
  static async getAuthToken() {
    return await AsyncStorage.getItem('authToken');
  }

  static async makeAuthenticatedRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const baseUrl = await API_CONFIG.getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (response.status === 401 && data.forceLogout) {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      throw new Error('Session expired. Please login again.');
    }

    return { response, data };
  }

  static async validateFaceCache(lastSyncTimestamp) {
    const body = lastSyncTimestamp ? { lastSyncTimestamp } : {};
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const baseUrl = await API_CONFIG.getBaseUrl();
    const response = await fetch(`${baseUrl}/employees/validate-face-cache`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { response, data };
  }

  static async logout() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  }
}

export default ApiService;