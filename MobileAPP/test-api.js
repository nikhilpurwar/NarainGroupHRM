// Test script for mobile app API endpoints
const API_BASE = 'https://naraingrouphrm.onrender.com/api';

// Test 1: Get all active employees for face enrollment
async function testGetEmployees() {
  try {
    console.log('Testing: Get active employees...');
    const response = await fetch(`${API_BASE}/employees`);
    const data = await response.json();
    
    if (data.success) {
      const activeEmployees = data.data.filter(emp => emp.status === 'active');
      console.log(`✅ Found ${activeEmployees.length} active employees`);
      return activeEmployees[0]; // Return first employee for further tests
    } else {
      console.log('❌ Failed to get employees:', data.message);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Test 2: Test barcode attendance
async function testBarcodeAttendance(empId) {
  try {
    console.log(`Testing: Barcode attendance for empId ${empId}...`);
    const response = await fetch(`${API_BASE}/employees/attendance/barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: empId,
        date: new Date().toISOString().split('T')[0],
        clientTs: Date.now(),
        tzOffsetMinutes: -330 // IST offset
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log(`✅ Barcode attendance: ${data.type.toUpperCase()} - ${data.employee_name}`);
    } else {
      console.log('❌ Barcode attendance failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Test 3: Test face enrollment (mock)
async function testFaceEnrollment(employeeId) {
  try {
    console.log(`Testing: Face enrollment for employee ${employeeId}...`);
    // Mock base64 image (1x1 pixel)
    const mockImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
    
    const response = await fetch(`${API_BASE}/employees/enroll-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employeeId,
        image: mockImage
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Face enrollment successful');
    } else {
      console.log('❌ Face enrollment failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Mobile App API Tests...\n');
  
  const employee = await testGetEmployees();
  if (employee) {
    await testBarcodeAttendance(employee.empId);
    await testFaceEnrollment(employee._id);
  }
  
  console.log('\n✨ Tests completed!');
}

// Export for Node.js or run in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
} else {
  runTests();
}