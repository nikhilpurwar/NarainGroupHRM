import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, ActivityIndicator, Animated, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/ApiService';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export default function AttendanceScanner({ onBack }) {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [scannedData, setScannedData] = useState(null);
  const [scanActive, setScanActive] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const pulseAnimation = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start(() => pulseAnimation());
  };

  useEffect(() => {
    if (scanActive && !scanned) pulseAnimation();
  }, [scanActive, scanned]);

  const markAttendance = async (barcodeCode) => {
    setIsLoading(true);
    setScannedData(barcodeCode);
    
    try {
      const now = new Date();
      const tzOffsetMinutes = -now.getTimezoneOffset();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`https://naraingrouphrm.onrender.com/api/employees/attendance/barcode?code=${barcodeCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await ApiService.getAuthToken()}` },
        body: JSON.stringify({ code: barcodeCode, date: now.toISOString().split('T')[0], clientTs: now.getTime(), tzOffsetMinutes }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccessMessage(`${result.type.toUpperCase()} - ${result.employee_name}\nTime: ${result.time}`);
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); setScanned(false); setScanActive(true); }, 3000);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.message, [{ text: 'OK', onPress: () => { setScanned(false); setScanActive(true); }}]);
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `${error.name === 'AbortError' ? 'Request timeout' : 'Network error'}. Please try again.`, 
        [{ text: 'OK', onPress: () => { setScanned(false); setScanActive(true); }}]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScanned = ({ type, data }) => {
    if (scanned || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanned(true);
    setScanActive(false);
    markAttendance(data);
  };

  if (hasPermission === null) {
    return <View style={[styles.container, styles.centerContent]}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.messageText}>Requesting camera permission...</Text></View>;
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
          <Text style={styles.title}>Barcode Scanner</Text>
        </View>
      </LinearGradient>

      <View style={styles.scannerContainer}>
        <CameraView style={styles.scanner} facing={cameraFacing} onBarcodeScanned={scanned ? undefined : handleBarcodeScanned} 
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13', 'ean8'] }} enableTorch={flashEnabled} />
        <View style={styles.overlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {scanActive && !scanned && <Animated.View style={[styles.scanLine, { opacity: fadeAnim }]} />}
          </View>
          <Text style={styles.instructionText}>Align Barcode code within frame</Text>
        </View>
      </View>

      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={60} color={theme.colors.success} />
            <Text style={styles.successTitle}>Attendance Marked</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
          </View>
        </View>
      )}

      <View style={[styles.bottomContainer, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
        {scanned && !showSuccess ? (
          <View style={styles.scanResult}>
            <Text style={styles.resultTitle}>Scanned: {scannedData}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => { setScanned(false); setScanActive(true); }} disabled={isLoading}>
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.retryButtonText}>Scan Again</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.infoText}>Position Barcode code in frame • Auto-scan enabled</Text>
        )}
      </View>

      <View style={styles.floatingControls}>
        <TouchableOpacity style={styles.floatingButton } onPress={() => setFlashEnabled(c => !c)}>
          <Ionicons name={flashEnabled ? 'flash' : 'flash-off'} size={24} color={flashEnabled ? '#FFD700' : '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingButton} onPress={() => setCameraFacing(c => c === 'back' ? 'front' : 'back')}>
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, borderBottomLeftRadius: theme.borderRadius.xl, borderBottomRightRadius: theme.borderRadius.xl, ...theme.shadows.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: theme.spacing.md, borderRadius: theme.borderRadius.full, backgroundColor: 'rgba(255,255,255,0.15)', ...theme.shadows.sm },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1, marginLeft: theme.spacing.md },
  scannerContainer: { flex: 1, overflow: 'hidden'},
  scanner: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scannerFrame: { width: width * 0.9, height: width * 0.5, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: theme.colors.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  scanLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: theme.colors.primary, top: '50%' },
  instructionText: { color: '#fff', fontSize: 14, marginTop: 40, textAlign: 'center', fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  bottomContainer: { padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, ...theme.shadows.lg, borderWidth: 1, borderColor: theme.colors.border },
  scanResult: { alignItems: 'center' },
  resultTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.md },
  retryButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borderRadius.md, ...theme.shadows.glow },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoText: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 14 },
  errorText: { fontSize: 20, fontWeight: '700', color: theme.colors.error, marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },
  messageText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md },
  permissionButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg, ...theme.shadows.glow },
  permissionButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  successCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.xl, alignItems: 'center', width: width * 0.85, ...theme.shadows.lg, borderWidth: 1, borderColor: theme.colors.border },
  successTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  successMessage: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' },
  floatingControls: {
  position: 'absolute',
  bottom: 94,
  right: 12,
  backgroundColor: 'rgba(0,0,0,0.85)',
  borderRadius: 28,          // keep one value
  elevation: 12,
  justifyContent: 'center',
  alignItems: 'center',
  gap: 14,                   // works only in RN 0.71+; else use margin
  paddingVertical: 20,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
  borderStyle: 'solid',
  ...theme.shadows.glow,
  shadowOffset: { width: 0, height: 4 },
},
  // floatingButton: { 
  //   width: 56, 
  //   height: 56, 
    
  // },
});