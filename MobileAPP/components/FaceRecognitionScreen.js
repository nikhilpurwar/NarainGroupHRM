import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function FaceRecognitionScreen({ onBack }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [recognizing, setRecognizing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('front'); // 'front' or 'back'
  const [enrollmentMode, setEnrollmentMode] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [livenessCheck, setLivenessCheck] = useState(true);
  const [livenessFrames, setLivenessFrames] = useState([]);
  const [livenessInstructions, setLivenessInstructions] = useState('');
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [headMovement, setHeadMovement] = useState(false);
  const cameraRef = useRef(null);
  const frameInterval = useRef(null);

  const captureAngles = [
    { name: 'straight', instruction: 'Look straight at camera' },
    { name: 'left', instruction: 'Turn head slightly left' },
    { name: 'right', instruction: 'Turn head slightly right' },
    { name: 'smile', instruction: 'Smile naturally' }
  ];

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
    loadEmployees();
  }, []);

  // Rest of your existing code remains the same...

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/face-recognition', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        let employeeList = result.data || [];
        setEmployees(employeeList);
        await AsyncStorage.setItem('employeeFaces', JSON.stringify(employeeList));
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.log('API Error:', error);
      const cached = await AsyncStorage.getItem('employeeFaces');
      if (cached) {
        try {
          const cachedEmployees = JSON.parse(cached);
          setEmployees(cachedEmployees);
        } catch (parseError) {
          console.error('Cache parsing failed:', parseError);
          await AsyncStorage.removeItem('employeeFaces');
          setEmployees([]);
        }
      } else {
        setEmployees([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startFaceRecognition = () => {
    if (recognizing || cameraFacing !== 'front') {
      if (cameraFacing !== 'front') {
        Alert.alert('Camera Error', 'Please switch to front camera for face recognition');
      }
      return;
    }
    
    setRecognizing(true);
    setCountdown(3);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          performRecognition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const performRecognition = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (livenessCheck) {
        await performLivenessDetection();
      } else {
        await captureAndRecognize();
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Face recognition failed: ${error.message}`);
      setRecognizing(false);
    }
  };

  const performLivenessDetection = async () => {
    setLivenessFrames([]);
    setBlinkDetected(false);
    setHeadMovement(false);
    
    const instructions = [
      'Look straight at camera',
      'Blink naturally',
      'Turn head slightly left',
      'Turn head slightly right',
      'Smile naturally'
    ];
    
    for (let i = 0; i < instructions.length; i++) {
      setLivenessInstructions(instructions[i]);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.6,
          base64: true,
          skipProcessing: true,
        });
        
        setLivenessFrames(prev => [...prev, photo.base64]);
      }
    }
    
    setLivenessInstructions('Processing...');
    await processLivenessAndRecognize();
  };

  const processLivenessAndRecognize = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/face/liveness', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: livenessFrames
        }),
      });

      const livenessResult = await response.json();
      
      if (livenessResult.success && livenessResult.isLive) {
        setBlinkDetected(livenessResult.checks.blinkDetected);
        setHeadMovement(livenessResult.checks.headMovement);
        await captureAndRecognize();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Liveness Check Failed', 'Please ensure you are a real person and try again.');
        setRecognizing(false);
      }
    } catch (error) {
      console.error('Liveness check error:', error);
      await captureAndRecognize(); // Fallback to recognition without liveness
    }
  };

  const captureAndRecognize = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        skipProcessing: true,
      });
      
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/recognize-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${photo.base64}`,
          threshold: 0.80
        }),
      });

      const result = await response.json();
      
      if (result.success && result.recognized) {
        await markAttendance(result.employee.employeeId, result.employee.name, result.confidence);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('No Match Found', 'Face not recognized. Please try again or contact admin.');
        setRecognizing(false);
      }
    }
  };

  const markAttendance = async (employeeId, employeeName, confidence) => {
    try {
      const now = new Date();
      const tzOffsetMinutes = -now.getTimezoneOffset();
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/face-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId,
          clientTs: now.getTime(),
          tzOffsetMinutes: tzOffsetMinutes,
          confidence: confidence
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const punchType = result.type.toUpperCase();
        const message = `${punchType} - ${result.employee_name}\nTime: ${result.time}\nMatch: ${(confidence * 100).toFixed(1)}%`;
        setSuccessMessage(message);
        setShowSuccess(true);
        
        setTimeout(() => {
          setShowSuccess(false);
          setRecognizing(false);
        }, 3000);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.message);
        setRecognizing(false);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Network error. Please try again.');
      setRecognizing(false);
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing(current => (current === 'front' ? 'back' : 'front'));
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.messageText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="camera-off" size={80} color="#FF3B30" />
        <Text style={styles.errorText}>Camera Access Required</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.permissionButtonText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="person" size={28} color="#fff" />
          <Text style={styles.title}>Face Recognition</Text>
        </View>
        <Text style={styles.subtitle}>Position your face and tap to scan</Text>
      </View>

      <View style={styles.scannerContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.scanner}
          facing={cameraFacing} // Use state variable here
        />
        
        <View style={styles.overlay}>
          {cameraFacing === 'front' && (
            <View style={[styles.faceFrame, recognizing && styles.faceFrameActive]}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              
              {countdown > 0 && (
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>{countdown}</Text>
                </View>
              )}
            </View>
          )}
          
          <Text style={styles.instructionText}>
            {cameraFacing === 'front' 
              ? (recognizing 
                  ? (countdown > 0 
                      ? 'Get ready...' 
                      : (livenessInstructions || 'Recognizing...'))
                  : 'Position your face and tap to scan')
              : 'Back camera - Use for taking photos'
            }
          </Text>
          
          {recognizing && livenessCheck && (
            <View style={styles.livenessIndicators}>
              <View style={[styles.indicator, blinkDetected && styles.indicatorActive]}>
                <Text style={styles.indicatorText}>👁️ Blink</Text>
              </View>
              <View style={[styles.indicator, headMovement && styles.indicatorActive]}>
                <Text style={styles.indicatorText}>↔️ Movement</Text>
              </View>
            </View>
          )}
        </View>

        {/* Flip Camera Button */}
        <TouchableOpacity
          style={styles.flipButton}
          onPress={toggleCameraFacing}
          disabled={recognizing}
        >
          <Ionicons 
            name="camera-reverse" 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.flipButtonText}>
            {cameraFacing === 'front' ? 'Back' : 'Front'}
          </Text>
        </TouchableOpacity>
      </View>

      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            <Text style={styles.successTitle}>Attendance Marked</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
          </View>
        </View>
      )}

      <View style={styles.bottomContainer}>
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.modeButton, livenessCheck && styles.modeButtonActive]}
            onPress={() => setLivenessCheck(!livenessCheck)}
          >
            <Ionicons name={livenessCheck ? 'shield-checkmark' : 'shield-outline'} size={20} color={livenessCheck ? '#fff' : '#007AFF'} />
            <Text style={[styles.modeButtonText, livenessCheck && styles.modeButtonTextActive]}>Liveness</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.scanButton, recognizing && styles.scanButtonDisabled]}
          onPress={startFaceRecognition}
          disabled={recognizing}
        >
          {recognizing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="scan" size={24} color="#fff" />
          )}
          <Text style={styles.scanButtonText}>
            {recognizing ? 'Scanning...' : 'Scan Face'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.infoText}>
          Face recognition ready • {employees.length} employees enrolled
          {livenessCheck && ' • Liveness detection enabled'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 5,
  },
  scannerContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  faceFrame: {
    width: width * 0.6,
    height: width * 0.8,
    borderWidth: 2,
    borderColor: '#007AFF',
    position: 'relative',
    borderRadius: 120,
  },
  faceFrameActive: {
    borderColor: '#4CAF50',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  countdownContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,122,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 40,
    textAlign: 'center',
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  // Flip Camera Button Styles
  flipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
  },
  scanButtonDisabled: {
    backgroundColor: '#8e8e93',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 20,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: width * 0.85,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    marginTop: 20,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  livenessIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 15,
  },
  indicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  indicatorActive: {
    backgroundColor: 'rgba(76,175,80,0.8)',
    borderColor: '#4CAF50',
  },
  indicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});