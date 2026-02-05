import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';
import ApiService from '../services/ApiService';

const { width } = Dimensions.get('window');

export default function FaceRecognitionScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [recognizing, setRecognizing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('front');
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    loadEmployees();
    // periodic revalidation every 5 minutes
    const interval = setInterval(() => {
      loadEmployees(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (recognizing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recognizing]);

  const loadEmployees = async (forceRefresh = false) => {
    try {
      const lastSync = await AsyncStorage.getItem('faceCacheLastSync');

      if (!forceRefresh) {
        // Validate cache with server
        try {
          const { data } = await ApiService.validateFaceCache(lastSync);
          if (data && data.cacheValid) {
            // Cache is valid: load from AsyncStorage if present
            const cached = await AsyncStorage.getItem('employeeFaces');
            if (cached) {
              try {
                setEmployees(JSON.parse(cached));
                return;
              } catch (e) {
                console.warn('Failed to parse cached employee data:', e);
                await AsyncStorage.removeItem('employeeFaces');
              }
            }
            // No cached data present, fall through to fetch fresh list
          } else {
            // Cache invalid/stale: use returned employees if provided
            if (data && Array.isArray(data.employees) && data.employees.length > 0) {
              setEmployees(data.employees);
              await AsyncStorage.setItem('employeeFaces', JSON.stringify(data.employees));
              await AsyncStorage.setItem('faceCacheLastSync', data.timestamp || new Date().toISOString());
              return;
            }
          }
        } catch (validationError) {
          console.warn('Cache validation failed, will attempt full fetch:', validationError.message || validationError);
        }
      }

      // Fallback: fetch full employee list from server
      const { data } = await ApiService.makeAuthenticatedRequest('/employees/face-recognition', { method: 'GET' });
      const employeesList = (data && data.data) ? data.data : [];
      setEmployees(employeesList || []);
      await AsyncStorage.setItem('employeeFaces', JSON.stringify(employeesList || []));
      await AsyncStorage.setItem('faceCacheLastSync', new Date().toISOString());
    } catch (error) {
      // Last resort: use cached data already on device
      const cached = await AsyncStorage.getItem('employeeFaces');
      if (cached) {
        try {
          setEmployees(JSON.parse(cached));
        } catch (parseError) {
          console.warn('Failed to parse cached employee data:', parseError);
          await AsyncStorage.removeItem('employeeFaces');
        }
      }
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
      
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: true });
        const payload = { image: `data:image/jpeg;base64,${photo.base64}`, threshold: 0.75, requireFaceDetection: true };
        // Basic image quality validation
        if (!photo.base64 || photo.base64.length < 1000) {
          throw new Error('Image quality too low');
        }

        const { data } = await ApiService.makeAuthenticatedRequest('/employees/recognize-face', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        const result = data;
        
        if (result.success && result.recognized && result.confidence >= 0.75) {
          // Ask user to confirm recognition to collect feedback for tuning
          Alert.alert(
            'Confirmation',
            `Did I recognize you as ${result.employee.name}?`,
            [
              { text: 'No', onPress: async () => {
                // send feedback to server
                try {
                  const payload = { employeeId: null, predictedId: result.employee.employeeId, correct: false, confidence: result.confidence };
                  await ApiService.makeAuthenticatedRequest('/employees/recognition-feedback', { method: 'POST', body: JSON.stringify(payload) });
                } catch (e) {
                  console.warn('Feedback send failed', e);
                }
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Okay', 'Thanks — feedback recorded. Try again.');
                setRecognizing(false);
              } },
              { text: 'Yes', onPress: async () => {
                // Update stored template with this confirmed capture
                try {
                  const payload = { employeeId: result.employee.employeeId, image: `data:image/jpeg;base64,${photo.base64}`, confidence: result.confidence };
                  await ApiService.makeAuthenticatedRequest('/employees/confirm-recognition', { method: 'POST', body: JSON.stringify(payload) });
                  // Invalidate local cache so we fetch updated templates
                  try {
                    await AsyncStorage.removeItem('faceCacheLastSync');
                    await loadEmployees(true);
                  } catch (e) {
                    console.warn('Failed to refresh face cache after confirm:', e);
                  }
                } catch (e) {
                  console.warn('Confirm recognition failed', e);
                }
                await markAttendance(result.employee.employeeId, result.employee.name, result.confidence);
              } }
            ],
            { cancelable: false }
          );
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const message = result.noFaceDetected ? 
            "Can't see you. Please look at the camera and ensure good lighting." :
            `Face not recognized (${result.confidence ? (result.confidence * 100).toFixed(1) + '%' : 'low'} match). Please try again.`;
          Alert.alert('Recognition Failed', message);
          setRecognizing(false);
        }
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Recognition failed: ${error.message}`);
      setRecognizing(false);
    }
  };

  const markAttendance = async (employeeId, employeeName, confidence) => {
    try {
      const now = new Date();
      const payload = { employeeId, clientTs: now.getTime(), tzOffsetMinutes: -now.getTimezoneOffset(), confidence };
      const { data } = await ApiService.makeAuthenticatedRequest('/employees/face-attendance', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = data;
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          `${result.type.toUpperCase()} - ${result.employee_name}\nTime: ${result.time}\nMatch: ${(confidence * 100).toFixed(1)}%`,
          [{ text: 'OK', onPress: () => setRecognizing(false) }]
        );
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

  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.messageText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="camera-off" size={80} color={theme.colors.error} />
        <Text style={styles.errorText}>Camera Access Required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={() => Camera.requestCameraPermissionsAsync()}>
          <Text style={styles.permissionButtonText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.colors.gradientDark} style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Face Recognition</Text>
            <Text style={styles.subtitle}>{employees.length} employees enrolled</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing} onCameraReady={() => setCameraReady(true)} />
        <View style={styles.overlay}>
          <Animated.View style={[styles.faceFrame, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.corner, styles.cornerTL, recognizing && styles.cornerActive]} />
            <View style={[styles.corner, styles.cornerTR, recognizing && styles.cornerActive]} />
            <View style={[styles.corner, styles.cornerBL, recognizing && styles.cornerActive]} />
            <View style={[styles.corner, styles.cornerBR, recognizing && styles.cornerActive]} />
            
            {countdown > 0 && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}
          </Animated.View>

          <View style={styles.instructionBubble}>
            <Ionicons name={recognizing ? 'scan' : 'person'} size={28} color={recognizing ? '#10B981' : '#3B82F6'} />
            <Text style={styles.instructionText}>
              {recognizing ? (countdown > 0 ? 'Get ready...' : 'Recognizing...') : 'Position your face and tap scan'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomContainer, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
        <TouchableOpacity style={[styles.scanButton, (!cameraReady || recognizing) && styles.disabledButton]} onPress={startFaceRecognition} disabled={!cameraReady || recognizing} activeOpacity={0.8}>
          <LinearGradient colors={['#8B5CF6', '#7730f2']} style={styles.scanGradient}>
            {recognizing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="scan" size={24} color="#fff" />
                <Text style={styles.scanText}>Scan Face</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.floatingButton} onPress={() => setCameraFacing(c => c === 'back' ? 'front' : 'back')}>
        <Ionicons name="camera-reverse" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, borderBottomLeftRadius: theme.borderRadius.xl, borderBottomRightRadius: theme.borderRadius.xl, ...theme.shadows.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: theme.spacing.md, borderRadius: theme.borderRadius.full, backgroundColor: 'rgba(255,255,255,0.15)', ...theme.shadows.sm },
  headerTextContainer: { flex: 1, marginLeft: theme.spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' },
  cameraContainer: { position: 'relative', flex: 1, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, paddingTop:80,  justifyContent: 'center', alignItems: 'center', gap: 80, backgroundColor: 'rgba(0,0,0,0.3)' },
  faceFrame: { width: width * 0.7, height: width * 0.9, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#3B82F6' },
  cornerActive: { borderColor: '#10B981' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 16 },
  countdownContainer: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -30 }, { translateY: -30 }], width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(59,130,246,0.9)', justifyContent: 'center', alignItems: 'center' },
  countdownText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  instructionBubble: { backgroundColor: 'rgba(0, 0, 0, 0.29)', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.xl, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, ...theme.shadows.lg },
  instructionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomContainer: { display:'flex', alignItems:'center'},
  scanButton: { width:200, marginBottom:20, borderRadius: theme.borderRadius.md, overflow: 'hidden', ...theme.shadows.glow },
  disabledButton: { opacity: 0.5 },
  scanGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md, gap: theme.spacing.sm, shadow: theme.shadows.glow},
  scanText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorText: { fontSize: 20, fontWeight: '700', color: theme.colors.error, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  messageText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md },
  permissionButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg, ...theme.shadows.glow },
  permissionButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  floatingButton: { position: 'absolute', top: 150, right: theme.spacing.lg, ...theme.shadows.glow },
});
