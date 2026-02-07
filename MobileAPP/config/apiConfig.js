// API Configuration - Automatic environment detection
const API_CONFIG = {
  // Local development URLs
  LOCAL: {
    // BASE_URL: 'http://10.0.2.2:5100/api', // Android emulator (if using AVD)
    BASE_URL: 'http://localhost:5100/api', // iOS simulator only
  },
  
  // Production URLs
  PRODUCTION: {
    BASE_URL: 'https://naraingrouphrm.onrender.com/api',
  },
  
  // Auto-detect environment and check server availability
  async getBaseUrl() {
    if (!__DEV__) return this.PRODUCTION.BASE_URL;
    
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 2000);
      
      await fetch(`${this.LOCAL.BASE_URL}/employees`, { 
        signal: controller.signal,
        method: 'GET'
      });
      
      console.log('Using localhost server');
      return this.LOCAL.BASE_URL;
    } catch (error) {
      console.log('Localhost unavailable, using production');
      return this.PRODUCTION.BASE_URL;
    }
  },
  
  // All API endpoints
  ENDPOINTS: {
    LOGIN: '/auth/login',
    EMPLOYEES: '/employees',
    ENROLL_FACE: '/employees/enroll-face',
    ATTENDANCE_BARCODE: '/employees/attendance/barcode',
  },
  
  // Get full URL for endpoint
  async getUrl(endpoint) {
    const baseUrl = await this.getBaseUrl();
    return baseUrl + endpoint;
  },
  
  TIMEOUT: 30000,
};

export default API_CONFIG;