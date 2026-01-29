import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/ApiService';

const { width, height } = Dimensions.get('window');

export default function AttendanceScanner({ onBack }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
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
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => pulseAnimation());
  };

  useEffect(() => {
    if (scanActive && !scanned) {
      pulseAnimation();
    }
  }, [scanActive, scanned]);

  const markAttendance = async (barcodeCode) => {
    setIsLoading(true);
    setScannedData(barcodeCode);
    
    try {
      const now = new Date();
      const tzOffsetMinutes = -now.getTimezoneOffset();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      // const response = await fetch(`http://localhost:5100/api/employees/attendance/barcode?code=${barcodeCode}`, {
      const response = await fetch(`https://naraingrouphrm.onrender.com/api/employees/attendance/barcode?code=${barcodeCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await ApiService.getAuthToken()}`
        },
        body: JSON.stringify({
          code: barcodeCode,
          date: now.toISOString().split('T')[0],
          clientTs: now.getTime(),
          tzOffsetMinutes: tzOffsetMinutes
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const punchType = result.type.toUpperCase();
        const message = `${punchType} - ${result.employee_name}\nTime: ${result.time}`;
        setSuccessMessage(message);
        setShowSuccess(true);
        
        setTimeout(() => {
          setShowSuccess(false);
          setScanned(false);
          setScanActive(true);
        }, 3000);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Error',
          result.message,
          [{ text: 'OK', onPress: () => {
            setScanned(false);
            setScanActive(true);
          }}]
        );
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMessage = error.name === 'AbortError' ? 'Request timeout' : 'Network error';
      Alert.alert(
        'Error',
        `${errorMessage}. Please try again.`,
        [{ text: 'OK', onPress: () => {
          setScanned(false);
          setScanActive(true);
        }}]
      );
      console.log('API Error:', error);
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

  const toggleFlash = () => {
    setFlashMode(current => current === 'off' ? 'torch' : 'off');
  };

  const resetScanner = () => {
    setScanned(false);
    setScanActive(true);
    setShowSuccess(false);
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
        <MaterialIcons name="camera-off" size={80} color="#FF3B30" />
        <Text style={styles.errorText}>Camera Access Required</Text>
        <Text style={styles.messageText}>
          Please enable camera permissions in your device settings to use the scanner.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          <Text style={styles.permissionButtonText}>Request Permission Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="scan" size={28} color="#fff" />
          <Text style={styles.title}>Barcode Scanner</Text>
          <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
            <Ionicons 
              name={flashMode === 'off' ? 'flash-off' : 'flash'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Scan your employee QR code</Text>
      </View>

      {/* Scanner Container */}
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.scanner}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13', 'ean8'],
          }}
          flash={flashMode}
        />
        
        {/* Scanner Overlay */}
        <View style={styles.overlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            
            {/* Animated scan line */}
            {scanActive && !scanned && (
              <Animated.View 
                style={[
                  styles.scanLine,
                  { opacity: fadeAnim }
                ]}
              />
            )}
          </View>
          
          <Text style={styles.instructionText}>
            Align QR code within the frame
          </Text>
        </View>
      </View>

      {/* Success Overlay */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Attendance Marked</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
          </View>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {scanned && !showSuccess ? (
          <View style={styles.scanResult}>
            <View style={styles.resultHeader}>
              <MaterialIcons name="qr-code-scanner" size={24} color="#007AFF" />
              <Text style={styles.resultTitle}>Scanned Code</Text>
            </View>
            <Text style={styles.resultData} numberOfLines={1}>
              {scannedData}
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={resetScanner}
                // disabled={isLoading}
              >
                <Ionicons name="close" size={20} color="#FF3B30" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.retryButton]}
                onPress={() => {
                  setScanned(false);
                  setScanActive(true);
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="reload" size={20} color="#fff" />
                    <Text style={styles.retryButtonText}>Scan Again</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.scanInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Ensure good lighting and steady hands
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Scan will be automatically processed
              </Text>
            </View>
          </View>
        )}
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
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 5,
  },
  flashButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerFrame: {
    width: width * 0.8,
    height: width * 0.5,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
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
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#007AFF',
    top: '50%',
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
  bottomContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  scanResult: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginLeft: 10,
  },
  resultData: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 14,
    color: '#666',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 0.48,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  scanInfo: {
    padding: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    flex: 1,
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
    lineHeight: 22,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
});