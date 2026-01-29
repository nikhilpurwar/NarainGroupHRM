import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your computer's IP address when testing on physical device
// For emulator, use 10.0.2.2 (Android) or localhost (iOS)
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:5100/api'  // Android emulator
  // ? 'http://localhost:5100/api'  // iOS simulator
  // ? 'http://YOUR_COMPUTER_IP:5100/api'  // Physical device
  : 'https://naraingrouphrm.onrender.com/api';  // Production

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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

  static async logout() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  }
}

export default ApiService;