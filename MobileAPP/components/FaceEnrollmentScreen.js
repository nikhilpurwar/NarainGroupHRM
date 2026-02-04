import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, StatusBar, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';
import API_CONFIG from '../config/apiConfig';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const FaceEnrollmentScreen = ({ employee, onBack }) => {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('front');
  const cameraRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const captureSteps = [
    { instruction: '👋 Follow my instructions', icon: 'hand-left', color: '#8B5CF6' },
    { instruction: '👀 Look straight at me', icon: 'eye', color: '#3B82F6' },
    { instruction: '✨ Perfect! Hold steady', icon: 'checkmark-circle', color: '#10B981' },
    { instruction: '👈 Turn head slightly left', icon: 'arrow-back', color: '#F59E0B' },
    { instruction: '👉 Turn head slightly right', icon: 'arrow-forward', color: '#F59E0B' },
    { instruction: '⬆️ Look up slightly', icon: 'arrow-up', color: '#06B6D4' },
    { instruction: '⬇️ Look down slightly', icon: 'arrow-down', color: '#06B6D4' },
    { instruction: '😊 Smile naturally', icon: 'happy', color: '#EC4899' },
    { instruction: '😐 Neutral expression', icon: 'remove-circle', color: '#6366F1' },
    { instruction: '🎉 All done! Thank you', icon: 'checkmark-done-circle', color: '#10B981' },
  ];

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  }, [currentStep]);

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false
      });

      // Resize image to reduce payload size
      const manipResult = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true }
      );

      const newImages = [...capturedImages, manipResult.base64];
      setCapturedImages(newImages);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (currentStep < captureSteps.length - 1) {
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.8);
        setCurrentStep(currentStep + 1);
      } else {
        await enrollFace(newImages);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to capture photo: ' + error.message);
    } finally {
      setCapturing(false);
    }
  };

  const enrollFace = async (images) => {
    try {
      // Minimal client-side checks
      if (!images || images.length < 3) {
        Alert.alert('Error', 'Please capture at least 3 images from different angles before enrolling.');
        setCapturedImages([]);
        setCurrentStep(0);
        return;
      }

      const payload = { employeeId: employee._id, images: images.map(img => `data:image/jpeg;base64,${img}`) };

      const { data } = await ApiService.makeAuthenticatedRequest(API_CONFIG.ENDPOINTS.ENROLL_FACE, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data && data.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', `Face template created from ${data.imagesProcessed || images.length} images for ${employee.name}`, [{ text: 'OK', onPress: onBack }]);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', (data && data.message) || 'Face enrollment failed');
        setCapturedImages([]);
        setCurrentStep(0);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Network error: ' + (error.message || error));
      setCapturedImages([]);
      setCurrentStep(0);
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

  const currentStepData = captureSteps[currentStep];
  const progress = (capturedImages.length / captureSteps.length) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.colors.gradientDark} style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Face Enrollment</Text>
            <Text style={styles.subtitle}>{employee?.name} • {employee?.empId}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing} onCameraReady={() => setCameraReady(true)} />
        <View style={styles.overlay}>
          <View style={styles.faceFrame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: currentStepData.color }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: currentStepData.color }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: currentStepData.color }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: currentStepData.color }]} />
          </View>

          <Animated.View style={[styles.instructionBubble, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name={currentStepData.icon} size={28} color={currentStepData.color} />
            <Text style={styles.instructionText}>{currentStepData.instruction}</Text>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.bottomContainer, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: currentStepData.color }]} />
          </View>
          <Text style={styles.progressText}>{capturedImages.length}/{captureSteps.length} captured</Text>
        </View>

        <TouchableOpacity style={[styles.captureButton, !cameraReady && styles.disabledButton]} onPress={capturePhoto} disabled={!cameraReady || capturing} activeOpacity={0.8}>
          <LinearGradient colors={[currentStepData.color, currentStepData.color + 'CC']} style={styles.captureGradient}>
            {capturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.captureText}>Capture</Text>
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
};

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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 80,                 // added
    justifyContent: 'flex-start',   // corrected
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 20,                        // added (RN 0.71+ supports gap)
  }, faceFrame: { width: width * 0.7, height: width * 0.9, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40 },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 16 },
  instructionBubble: { backgroundColor: 'rgba(0, 0, 0, 0.29)', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.xl, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, ...theme.shadows.lg },
  instructionText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  bottomContainer: { padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, ...theme.shadows.lg, borderWidth: 1, borderColor: theme.colors.border },
  progressContainer: { marginBottom: theme.spacing.md },
  progressBar: { height: 8, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.full, overflow: 'hidden', marginBottom: theme.spacing.sm },
  progressFill: { height: '100%', borderRadius: theme.borderRadius.full },
  progressText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', fontWeight: '600' },
  captureButton: { borderRadius: theme.borderRadius.md, overflow: 'hidden', ...theme.shadows.glow },
  disabledButton: { opacity: 0.5 },
  captureGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
  captureText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorText: { fontSize: 20, fontWeight: '700', color: theme.colors.error, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  messageText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md },
  permissionButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg, ...theme.shadows.glow },
  permissionButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  floatingButton: { position: 'absolute', top: 150, right: theme.spacing.lg, ...theme.shadows.glow },
});

export default FaceEnrollmentScreen;
