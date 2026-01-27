import React, { useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100';

const FaceEnrollment = ({ employeeId, onSuccess, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);

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

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImages(prev => [...prev, imageData]);
    
    toast.success(`Image ${capturedImages.length + 1} captured`);
  }, [capturedImages.length]);

  const enrollFaces = useCallback(async () => {
    if (capturedImages.length === 0) {
      toast.error('Please capture at least one image');
      return;
    }

    setLoading(true);
    
    try {
      let successCount = 0;
      
      for (const image of capturedImages) {
        try {
          const response = await axios.post(`${API_URL}/api/employees/face/enroll`, {
            employeeId,
            image
          });
          
          if (response.data.success) {
            successCount++;
          }
        } catch (error) {
          console.error('Enrollment error:', error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} face(s) enrolled successfully`);
        onSuccess?.();
      } else {
        toast.error('Face enrollment failed');
      }
    } catch (error) {
      toast.error('Enrollment failed');
    } finally {
      setLoading(false);
    }
  }, [capturedImages, employeeId, onSuccess]);

  const clearImages = useCallback(() => {
    setCapturedImages([]);
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Face Enrollment</h2>
      
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

        <div className="flex gap-4 justify-center flex-wrap">
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
                onClick={captureImage}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Capture Image ({capturedImages.length}/5)
              </button>
              
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Camera
              </button>
            </>
          )}
          
          {capturedImages.length > 0 && (
            <>
              <button
                onClick={enrollFaces}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Enrolling...' : 'Enroll Faces'}
              </button>
              
              <button
                onClick={clearImages}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Images
              </button>
            </>
          )}
          
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>Capture 3-5 images from different angles for better accuracy</p>
          <p>Ensure good lighting and look directly at the camera</p>
          {capturedImages.length > 0 && (
            <p className="text-green-600 font-medium">
              {capturedImages.length} image(s) captured
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceEnrollment;