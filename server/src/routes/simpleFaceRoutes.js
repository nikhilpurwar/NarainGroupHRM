import express from 'express';
import multer from 'multer';
import minimalFaceService from '../services/minimalFaceService.js';

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

    const imageBuffer = Buffer.from(image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    const result = await minimalFaceService.enrollFace(employeeId, imageBuffer);
    
    res.json({
      success: true,
      message: 'Face enrolled successfully'
    });
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

    const imageBuffer = Buffer.from(image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    
    const result = await minimalFaceService.recognizeFace(imageBuffer, threshold);
    
    if (result.recognized) {
      res.json({
        success: true,
        recognized: true,
        employeeId: result.employeeId,
        employee: {
          name: `Employee ${result.employeeId}`,
          empId: result.employeeId
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

    const result = await minimalFaceService.performLivenessCheck(frames);
    
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
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const date = now.toISOString().split('T')[0];

    // Simulate attendance marking
    const punchType = Math.random() > 0.5 ? 'in' : 'out';

    res.json({
      success: true,
      type: punchType,
      employee_name: `Employee ${employeeId}`,
      time: time,
      date: date
    });

  } catch (error) {
    console.error('Face attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;