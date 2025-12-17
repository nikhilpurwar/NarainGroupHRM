# Barcode Scanner API Integration Guide

## Endpoint Details

**URL:** `https://iudo.in/hrm/api/store-emp-attend`

**Methods Supported:** 
- POST (Recommended for most apps)
- GET (Alternative method)

**Query Parameters:**
- `code` (required): Employee ID/Code from barcode (e.g., `RPM-25-0004`)

**Request Body (POST only):**
```json
{
  "date": "2025-12-17"  // Optional, defaults to today (YYYY-MM-DD format)
}
```

---

## Usage Examples

### Example 1: POST Request with cURL (Most Common)
```bash
curl -X POST "https://iudo.in/hrm/api/store-emp-attend?code=RPM-25-0004" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-12-17"}'
```

### Example 2: POST Request with cURL (Today's Date)
```bash
curl -X POST "https://iudo.in/hrm/api/store-emp-attend?code=RPM-25-0004"
```

### Example 3: GET Request (Simple)
```bash
curl "https://iudo.in/hrm/api/store-emp-attend?code=RPM-25-0004"
```

### Example 4: JavaScript/Fetch
```javascript
// Fetch API
fetch('https://iudo.in/hrm/api/store-emp-attend?code=RPM-25-0004', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ date: '2025-12-17' })
})
.then(res => res.json())
.then(data => console.log(data));

// Or simpler version without date
fetch('https://iudo.in/hrm/api/store-emp-attend?code=RPM-25-0004', {
  method: 'POST'
})
.then(res => res.json())
.then(data => console.log(data));
```

### Example 5: Python Requests
```python
import requests
import json

url = "https://iudo.in/hrm/api/store-emp-attend?code=RPM-25-0004"
response = requests.post(url, json={'date': '2025-12-17'})
print(response.json())
```

### Example 6: Axios (React/Node.js)
```javascript
import axios from 'axios';

const markAttendance = async (empCode) => {
  try {
    const response = await axios.post(
      `https://iudo.in/hrm/api/store-emp-attend?code=${empCode}`,
      { date: new Date().toISOString().slice(0, 10) }
    );
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

markAttendance('RPM-25-0004');
```

---

## Response Format

### Success Response (Attendance Marked)
```json
{
  "success": true,
  "message": "Attendance marked for John Doe",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "empId": "RPM-25-0004",
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "9876543210",
    "headDepartment": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Production"
    },
    "subDepartment": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Assembly"
    },
    "group": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Group A"
    },
    "designation": {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Operator"
    },
    "attendance": [
      {
        "date": "2025-12-17",
        "status": "present",
        "inTime": "09:30:45",
        "note": "Marked via barcode scanner"
      }
    ]
  }
}
```

### Already Marked Response
```json
{
  "success": true,
  "message": "Attendance already marked for today",
  "data": { ... },
  "alreadyMarked": true
}
```

### Error Response - Employee Not Found
```json
{
  "success": false,
  "message": "Employee not found with this code"
}
```

### Error Response - Missing Code
```json
{
  "success": false,
  "message": "Barcode code is required"
}
```

### Error Response - Server Error
```json
{
  "success": false,
  "message": "Error message details"
}
```

---

## Integration Steps for Your App

1. **Scan the barcode** - Get employee code (e.g., `RPM-25-0004`)

2. **Make API Call:**
   ```
   POST https://iudo.in/hrm/api/store-emp-attend?code={scanned_code}
   ```

3. **Check Response:**
   - If `success: true` → Attendance marked ✓
   - If `alreadyMarked: true` → Already marked today
   - If `success: false` → Show error message

4. **Feedback to User:**
   - Success: Show employee name and "Attendance Marked" message
   - Already Marked: "Already marked for today"
   - Error: Show error message from response

---

## Important Notes

- **Employee Code Format:** Must match the `empId` field in database (e.g., `RPM-25-0004`)
- **Date Format:** Use `YYYY-MM-DD` format (ISO 8601)
- **Default Behavior:** If no date provided, marks for today
- **Duplicate Prevention:** Prevents marking same employee twice on same day
- **Timestamp:** Automatically records `inTime` when marked
- **Status:** Always marks as "present" with scanner

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Employee not found | Verify employee code in barcode matches database |
| Already marked for today | Previous scan was successful - attendance already recorded |
| No response from server | Check network connectivity & server status |
| 404 Not Found | Verify URL is correct: `https://iudo.in/hrm/api/store-emp-attend` |
| CORS Error | Server has CORS enabled; check browser console for details |

---

## Real-World Usage Example

```javascript
// Example: Scanning app written in React/JavaScript

async function handleBarcodeScan(scannedCode) {
  try {
    const response = await fetch(
      `https://iudo.in/hrm/api/store-emp-attend?code=${scannedCode}`,
      { method: 'POST' }
    );
    
    const result = await response.json();
    
    if (result.success) {
      // Show success message
      alert(`✓ ${result.data.name} - Attendance Marked`);
      // Play success sound
      playSuccessSound();
    } else if (result.alreadyMarked) {
      alert(`⚠️ Already marked for today`);
      // Play warning sound
      playWarningSound();
    } else {
      alert(`✗ Error: ${result.message}`);
      // Play error sound
      playErrorSound();
    }
  } catch (error) {
    alert(`Connection Error: ${error.message}`);
  }
}

// Usage
handleBarcodeScan('RPM-25-0004');
```

---

## Support

For issues or questions about the API integration:
- Check the endpoint URL is correct
- Verify employee codes in your barcode match database `empId` values
- Ensure network connectivity to the server
