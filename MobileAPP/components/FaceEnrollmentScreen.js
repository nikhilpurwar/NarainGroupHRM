import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FaceEnrollmentScreen = ({ employee, onBack }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const cameraRef = useRef(null);

  const captureSteps = [
    { instruction: 'Look straight at camera', angle: 'center' },
    { instruction: 'Turn head slightly left', angle: 'left' },
    { instruction: 'Turn head slightly right', angle: 'right' },
    { instruction: 'Look up slightly', angle: 'up' },
    { instruction: 'Look down slightly', angle: 'down' },
    { instruction: 'Smile naturally', angle: 'smile' },
    { instruction: 'Neutral expression', angle: 'neutral' },
  ];

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
      });
      
      const newImages = [...capturedImages, photo.base64];
      setCapturedImages(newImages);
      
      if (currentStep < captureSteps.length - 1) {
        setCurrentStep(currentStep + 1);
        Alert.alert('Good!', `${newImages.length}/${captureSteps.length} captured. ${captureSteps[currentStep + 1].instruction}`);
      } else {
        await enrollFace(newImages);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo: ' + error.message);
    } finally {
      setCapturing(false);
    }
  };

  const enrollFace = async (images) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      Alert.alert('Processing', 'Generating embeddings...');
      
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees/enroll-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: employee._id,
          images: images.map(img => `data:image/jpeg;base64,${img}`)
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Success', 
          `Face template created from ${result.imagesProcessed} images for ${employee.name}`,
          [{ text: 'OK', onPress: onBack }]
        );
      } else {
        Alert.alert('Error', result.message || 'Face enrollment failed');
        setCapturedImages([]);
        setCurrentStep(0);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error: ' + error.message);
      setCapturedImages([]);
      setCurrentStep(0);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Enroll Face</Text>
      </View>

      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{employee?.name}</Text>
        <Text style={styles.employeeId}>ID: {employee?.empId}</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onCameraReady={() => setCameraReady(true)}
        />
        <View style={styles.overlay}>
          <View style={styles.faceFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>{captureSteps[currentStep].instruction}</Text>
        <Text style={styles.progressText}>{capturedImages.length}/{captureSteps.length} captured</Text>
      </View>

      <TouchableOpacity 
        style={[styles.captureButton, !cameraReady && styles.disabledButton]}
        onPress={capturePhoto}
        disabled={!cameraReady || capturing}
      >
        <Text style={styles.captureText}>
          {capturing ? 'Capturing...' : 'Capture Face'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#007AFF',
  },
  backButton: {
    marginRight: 20,
  },
  backText: {
    color: 'white',
    fontSize: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  employeeInfo: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  employeeId: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  faceFrame: {
    width: 200,
    height: 250,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 100,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00FF00',
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
  instructions: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  progressText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  captureButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  captureText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FaceEnrollmentScreen;
