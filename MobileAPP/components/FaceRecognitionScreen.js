import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';

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

  const loadEmployees = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/face-recognition', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data || []);
        await AsyncStorage.setItem('employeeFaces', JSON.stringify(result.data || []));
      }
    } catch (error) {
      const cached = await AsyncStorage.getItem('employeeFaces');
      if (cached) setEmployees(JSON.parse(cached));
    }
  };

  const startFaceRecognition = () => {
    if (recognizing || cameraFacing !== 'front') return;
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
        const token = await AsyncStorage.getItem('authToken');
        
        const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/recognize-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.base64}`, threshold: 0.80 }),
        });

        const result = await response.json();
        
        if (result.success && result.recognized) {
          await markAttendance(result.employee.employeeId, result.employee.name, result.confidence);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('No Match', 'Face not recognized. Please try again.');
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
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/face-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          employeeId,
          clientTs: now.getTime(),
          tzOffsetMinutes: -now.getTimezoneOffset(),
          confidence
        }),
      });

      const result = await response.json();
      
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
      <LinearGradient colors={theme.colors.gradient} style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
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
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.scanGradient}>
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
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, ...theme.shadows.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: theme.spacing.md, borderRadius: theme.borderRadius.full, backgroundColor: 'rgba(255,255,255,0.15)', ...theme.shadows.sm },
  headerTextContainer: { flex: 1, marginLeft: theme.spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' },
  cameraContainer: { flex: 1, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, paddingTop: 80, justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  faceFrame: { width: width * 0.7, height: width * 0.9, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#3B82F6' },
  cornerActive: { borderColor: '#10B981' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 16 },
  countdownContainer: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -30 }, { translateY: -30 }], width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(59,130,246,0.9)', justifyContent: 'center', alignItems: 'center' },
  countdownText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  instructionBubble: { backgroundColor: 'rgba(0, 0, 0, 0.29)', marginBottom:100, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.xl, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, ...theme.shadows.lg },
  instructionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomContainer: { display:'flex', alignItems:'center'},
  scanButton: { width:200, marginBottom:20, borderRadius: theme.borderRadius.md, overflow: 'hidden', ...theme.shadows.glow },
  disabledButton: { opacity: 0.5 },
  scanGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
  scanText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorText: { fontSize: 20, fontWeight: '700', color: theme.colors.error, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  messageText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md },
  permissionButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg, ...theme.shadows.glow },
  permissionButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  floatingButton: { position: 'absolute', top: 150, right: theme.spacing.lg, ...theme.shadows.glow },
});
