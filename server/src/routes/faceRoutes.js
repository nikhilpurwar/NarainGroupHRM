const express = require('express');
const multer = require('multer');
const faceRecognitionService = require('../services/faceRecognitionService');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Face enrollment endpoint
router.post('/face/enroll', async (req, res) => {
  try {
    const { employeeId, image } = req.body;
    
    if (!employeeId || !image) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and image are required'
      });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    // Enroll face
    const result = await faceRecognitionService.enrollFace(employeeId, imageBuffer);
    
    if (result.success) {
      // Update employee record
      await Employee.findByIdAndUpdate(employeeId, {
        faceEnrolled: true,
        faceEnrollmentDate: new Date()
      });
      
      res.json({
        success: true,
        message: 'Face enrolled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Face enrollment failed'
      });
    }
  } catch (error) {
    console.error('Face enrollment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Face recognition endpoint
router.post('/face/recognize', async (req, res) => {
  try {
    const { image, threshold = 0.6 } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    // Recognize face
    const result = await faceRecognitionService.recognizeFace(imageBuffer, threshold);
    
    if (result.recognized) {
      const employee = await Employee.findById(result.employeeId);
      
      res.json({
        success: true,
        recognized: true,
        employeeId: result.employeeId,
        employee: {
          name: employee.name,
          empId: employee.empId
        },
        confidence: result.confidence
      });
    } else {
      res.json({
        success: true,
        recognized: false,
        confidence: result.confidence
      });
    }
  } catch (error) {
    console.error('Face recognition error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Liveness detection endpoint
router.post('/face/liveness', async (req, res) => {
  try {
    const { frames } = req.body;
    
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Frames array is required'
      });
    }

    // Convert base64 frames to buffers
    const frameBuffers = frames.map(frame => 
      Buffer.from(frame.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64')
    );
    
    // Perform liveness check
    const result = await faceRecognitionService.performLivenessCheck(frameBuffers);
    
    res.json({
      success: true,
      isLive: result.isLive,
      score: result.score,
      checks: result.checks
    });
  } catch (error) {
    console.error('Liveness detection error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Face attendance endpoint
router.post('/attendance/face', async (req, res) => {
  try {
    const { employeeId, clientTs, tzOffsetMinutes } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get current date in employee's timezone
    const now = new Date();
    const localDate = new Date(now.getTime() + (tzOffsetMinutes || 0) * 60000);
    const dateStr = localDate.toISOString().split('T')[0];

    // Check existing attendance
    let attendance = await Attendance.findOne({
      employeeId: employeeId,
      date: dateStr
    });

    let punchType;
    let punchTime = localDate.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!attendance) {
      // First punch - IN
      attendance = new Attendance({
        employeeId: employeeId,
        date: dateStr,
        punchIn: punchTime,
        punchInMethod: 'face',
        status: 'present'
      });
      punchType = 'in';
    } else if (!attendance.punchOut) {
      // Second punch - OUT
      attendance.punchOut = punchTime;
      attendance.punchOutMethod = 'face';
      
      // Calculate total hours
      const inTime = new Date(`${dateStr}T${attendance.punchIn}`);
      const outTime = new Date(`${dateStr}T${punchTime}`);
      const diffMs = outTime - inTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      attendance.totalHours = Math.max(0, diffHours);
      
      punchType = 'out';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Attendance already completed for today'
      });
    }

    await attendance.save();

    res.json({
      success: true,
      type: punchType,
      employee_name: employee.name,
      time: punchTime,
      date: dateStr
    });

  } catch (error) {
    console.error('Face attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employees for face enrollment
router.get('/faces', async (req, res) => {
  try {
    const employees = await Employee.find(
      { status: 'active' },
      { name: 1, empId: 1, faceEnrolled: 1 }
    ).sort({ name: 1 });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
});

module.exports = router;