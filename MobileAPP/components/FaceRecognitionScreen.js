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

export default function FaceRecognitionScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [recognizing, setRecognizing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('front'); // 'front' or 'back'
  const cameraRef = useRef(null);

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
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/face-recognition');
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
        const cachedEmployees = JSON.parse(cached);
        setEmployees(cachedEmployees);
      } else {
        setEmployees([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startFaceRecognition = () => {
    if (recognizing) return;
    
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
      
      // Capture image from camera
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          skipProcessing: true,
        });
        
        // Send image to face recognition API
        const recognitionResponse = await fetch('https://naraingrouphrm.onrender.com/api/employees/recognize-face', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: `data:image/jpeg;base64,${photo.base64}`,
            threshold: 0.7
          }),
        });
        
        const recognitionResult = await recognitionResponse.json();
        
        console.log('Recognition API Response:', recognitionResult);
        
        if (recognitionResult.success && recognitionResult.recognized) {
          // Face recognized, mark attendance
          await markAttendance(recognitionResult.employee.employeeId);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          console.log('Recognition failed:', recognitionResult.message);
          Alert.alert('Recognition Failed', recognitionResult.message || 'Face not recognized. Please try again or contact admin.');
          setRecognizing(false);
        }
      } else {
        Alert.alert('Error', 'Camera not available.');
        setRecognizing(false);
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Face recognition failed: ${error.message}`);
      setRecognizing(false);
    }
  };

  const markAttendance = async (employeeId) => {
    try {
      const now = new Date();
      const tzOffsetMinutes = -now.getTimezoneOffset();
      
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/face-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          clientTs: now.getTime(),
          tzOffsetMinutes: tzOffsetMinutes
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const punchType = result.type.toUpperCase();
        const message = `${punchType} - ${result.employee_name}\nTime: ${result.time}`;
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
          onPress={() => Camera.requestCameraPermissionsAsync()}
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
              ? (recognizing ? (countdown > 0 ? 'Get ready...' : 'Recognizing...') : 'Position your face and tap to scan')
              : 'Back camera - Use for taking photos'
            }
          </Text>
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
    justifyContent: 'center',
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
});