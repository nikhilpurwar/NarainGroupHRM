import React, { useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100';

const FaceRecognitionAttendance = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCapturing(true);
      }
    } catch (error) {
      toast.error('Camera access denied');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Recognize face
      const response = await axios.post(`${API_URL}/api/employees/face/recognize`, {
        image: imageData,
        threshold: 0.85
      });

      if (response.data.success && response.data.recognized) {
        const employee = response.data.employee;
        
        // Mark attendance
        const attendanceResponse = await axios.post(`${API_URL}/api/employees/attendance/face`, {
          employeeId: employee.employeeId
        });

        if (attendanceResponse.data.success) {
          toast.success(`${attendanceResponse.data.type.toUpperCase()} - ${employee.name} (${attendanceResponse.data.time})`);
        } else {
          toast.error(attendanceResponse.data.message);
        }
      } else {
        toast.error('Face not recognized. Please try again or contact admin.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Recognition failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Face Recognition Attendance</h2>
      
      <div className="space-y-4">
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-80 object-cover"
            style={{ display: isCapturing ? 'block' : 'none' }}
          />
          
          {!isCapturing && (
            <div className="w-full h-80 flex items-center justify-center bg-gray-200">
              <p className="text-gray-500">Camera not active</p>
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-4 justify-center">
          {!isCapturing ? (
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Camera
            </button>
          ) : (
            <>
              <button
                onClick={captureAndRecognize}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : 'Mark Attendance'}
              </button>
              
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Camera
              </button>
            </>
          )}
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>Position your face in the camera frame and click "Mark Attendance"</p>
          <p>Ensure good lighting for better recognition accuracy</p>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognitionAttendance;