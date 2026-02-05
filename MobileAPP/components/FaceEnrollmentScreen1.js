import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
// Conditional import for expo-face-detector (not available in Expo Go)
let FaceDetector = null;
try {
  FaceDetector = require('expo-face-detector');
} catch (e) {
  console.warn('expo-face-detector not available:', e.message);
}
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/apiConfig';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const TOTAL_IMAGES = 50;
const CAPTURE_DELAY = 20; // ms (~20 FPS)
const VIDEO_RECORD_MS = 4000; // record 4s by default
const EXTRACT_FRAMES = 100; // target frames to extract from video
// Tuneable: stop early when we have enough good frames (speed up extraction)
const MIN_GOOD_FRAMES = 30; // stop when we've found this many good frames
const THUMBNAIL_BATCH = 3; // fetch thumbnails in small concurrent batches to speed up extraction

const FaceEnrollmentScreen1 = ({ employee, onBack }) => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isBursting, setIsBursting] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [cameraFacing, setCameraFacing] = useState('front');

  const stopBurstRef = useRef(false);
  const recordingActiveRef = useRef(false);
  const currentRecordingRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [lastFace, setLastFace] = useState(null);
  const [goodFrameCount, setGoodFrameCount] = useState(0);

  const seenHashesRef = useRef(new Set());

  // Simple base64-snippet hash (fast) to dedupe near-duplicate frames
  const hashBase64Snippet = (b64) => {
    const s = b64.slice(0, 200);
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i); /* h * 33 + c */
      h = h & 0xffffffff;
    }
    return (h >>> 0).toString(36);
  };

  // Lightweight heuristic for "sharpness" using variance of sampled base64 chars
  // Not perfect but filters very blurry frames and reduces noise when native detector is absent.
  const isLikelySharp = (b64) => {
    const sample = b64.slice(0, 1200);
    let sum = 0, sumsq = 0, n = 0;
    for (let i = 0; i < sample.length; i += 3) {
      const v = sample.charCodeAt(i);
      sum += v; sumsq += v * v; n++;
    }
    if (n === 0) return false;
    const mean = sum / n;
    const variance = (sumsq / n) - (mean * mean);
    return variance > 60; // threshold chosen empirically
  }; 

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
      setHasPermission(status === 'granted' && audioStatus === 'granted');
    })();
  }, []);

  /** ------------------ BURST CAPTURE ------------------ **/
  const startBurstCapture = async () => {
    if (!cameraRef.current || isBursting || !cameraReady) return;

    setIsBursting(true);
    setBurstCount(0);
    stopBurstRef.current = false;

    // Ensure there's a face aligned before starting burst capture
    const faceOk = await waitForFace(3000);
    if (!faceOk) {
      setIsBursting(false);
      Alert.alert('No face detected', 'Please align your face inside the frame and try again.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const images = [];

    try {
      for (let i = 0; i < TOTAL_IMAGES; i++) {
        if (stopBurstRef.current) break;

        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.4,
            base64: false,
            exif: false,
          });

          if (!photo || !photo.uri) {
            console.warn('Photo capture failed - no URI returned');
            continue;
          }

          const processed = await manipulateAsync(
            photo.uri,
            [{ resize: { width: 480 } }],
            {
              compress: 0.5,
              format: SaveFormat.JPEG,
              base64: true,
            }
          );

          if (processed && processed.base64) {
            images.push(processed.base64);
            setBurstCount(prev => prev + 1);

            if (i % 10 === 0) {
              await Haptics.selectionAsync();
            }
          }
        } catch (photoError) {
          console.warn('Individual photo capture failed:', photoError.message);
          // Continue with next photo instead of breaking
        }

        await new Promise(res => setTimeout(res, CAPTURE_DELAY));
      }

      if (!stopBurstRef.current && images.length > 0) {
        await enrollFace(images);
      } else if (images.length === 0) {
        Alert.alert('Error', 'No images were captured successfully');
      }
    } catch (err) {
      Alert.alert('Error', 'Burst capture failed: ' + (err.message || err));
    } finally {
      setIsBursting(false);
    }
  };

  // New: record short video and extract frames using expo-video-thumbnails

  // Handle real-time face tracking from camera (if supported)
  const handleFacesDetected = ({ faces }) => {
    if (faces && faces.length > 0) {
      setLastFace(faces[0]);
    } else {
      setLastFace(null);
    }
  };

  // Helper: basic face quality check used before starting capture
  const isFaceGood = (face) => {
    if (!face) return false;
    const w = face.bounds?.size?.width ?? 0;
    const h = face.bounds?.size?.height ?? 0;
    const areaRatio = (w * h) / (width * width);
    const eyesOpen = (face.leftEyeOpenProbability ?? 0) > 0.25 || (face.rightEyeOpenProbability ?? 0) > 0.25;
    const headAngleOK = Math.abs(face.rollAngle ?? 0) < 25 && Math.abs(face.yawAngle ?? 0) < 25;
    return areaRatio > 0.02 && eyesOpen && headAngleOK;
  };

  // Wait up to timeoutMs for a good face to appear. If FaceDetector is not available, ask the user whether to proceed.
  const waitForFace = async (timeoutMs = 3000, pollMs = 200) => {
    if (!FaceDetector) {
      return new Promise(resolve => {
        Alert.alert(
          'Face detection unavailable',
          'Live face detection is not available in this build. Proceed without live check?',
          [
            { text: 'Proceed', onPress: () => resolve(true) },
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' }
          ],
          { cancelable: true }
        );
      });
    }

    const start = Date.now();
    while ((Date.now() - start) < timeoutMs) {
      if (isFaceGood(lastFace)) return true;
      await new Promise(r => setTimeout(r, pollMs));
    }
    return false;
  };

  const startVideoCapture = async () => {
    if (!cameraRef.current || isBursting) return;

    // Prevent starting if a recording is already active
    if (recordingActiveRef.current) {
      Alert.alert('Recording in progress', 'Please wait for the current recording to finish or cancel it.');
      return;
    }

    setIsBursting(true);
    setBurstCount(0);
    stopBurstRef.current = false;

    try {
      // Ensure a face is present/aligned before starting the recording
      const faceOk = await waitForFace(3000);
      if (!faceOk) {
        setIsBursting(false);
        Alert.alert('No face detected', 'Please align your face inside the frame and try again.');
        return;
      }

      // Ensure microphone permission is granted (Android requires RECORD_AUDIO)
      const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
      if (audioStatus !== 'granted') {
        Alert.alert(
          'Microphone permission required',
          'Please allow microphone permission to record video (enable RECORD_AUDIO in app settings).'
        );
        setIsBursting(false);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Mark recording active so we can stop it from cancel
      recordingActiveRef.current = true;

      // Start recording (background) and also run a live capture loop to take pictures while recording
      const recordPromise = cameraRef.current.recordAsync({ 
        maxDuration: Math.ceil(VIDEO_RECORD_MS / 1000),
        mute: true
      });
      currentRecordingRef.current = recordPromise;

      // Frames collected by live capture
      const frames = [];

      // local counter to avoid async setState races
      let localGood = 0;
      let fallbackToThumbnail = false;

      // Live capture loop: sample camera frames every 150ms while recordingActiveRef is true
      (async () => {
        const intervalMs = Math.max(100, Math.floor(VIDEO_RECORD_MS / Math.min(EXTRACT_FRAMES, TOTAL_IMAGES)));
        const start = Date.now();

        while (recordingActiveRef.current && (Date.now() - start) < VIDEO_RECORD_MS && !stopBurstRef.current && frames.length < TOTAL_IMAGES && localGood < MIN_GOOD_FRAMES) {
          try {
            // Only attempt to capture when face is detected and reasonably centered
            const facePresent = lastFace && lastFace.bounds && lastFace.bounds.size && lastFace.bounds.size.width && lastFace.bounds.size.height;
            const faceAreaEnough = facePresent ? (lastFace.bounds.size.width * lastFace.bounds.size.height) / (width * width) > 0.02 : false; // >2% of view
            const eyesOpenEnough = lastFace && ( (lastFace.leftEyeOpenProbability ?? 0) > 0.25 || (lastFace.rightEyeOpenProbability ?? 0) > 0.25 );
            const headAngleOK = lastFace && Math.abs(lastFace.rollAngle ?? 0) < 25 && Math.abs(lastFace.yawAngle ?? 0) < 25;

            if (FaceDetector && (!facePresent || !faceAreaEnough || !eyesOpenEnough || !headAngleOK)) {
              // skip capture until face aligns
            } else {
              // Try to take picture while recording (some platforms may not allow it)
              try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.4, base64: true, skipProcessing: true });
                if (photo && photo.base64) {
                  // Quick size check
                  if (photo.base64.length > 2000) {
                    const processed = await manipulateAsync(photo.uri, [{ resize: { width: 480 } }], { compress: 0.5, format: SaveFormat.JPEG, base64: true });
                    // Dedupe + sharpness filter
                    const snippetHash = hashBase64Snippet(processed.base64);
                    if (seenHashesRef.current.has(snippetHash)) {
                      // duplicate frame, skip
                    } else if (!isLikelySharp(processed.base64)) {
                      // likely blurry / low-detail, skip
                    } else {
                      seenHashesRef.current.add(snippetHash);
                      frames.push(processed.base64);
                      setBurstCount(prev => prev + 1);
                      localGood++;
                      setGoodFrameCount(localGood);

                      if (localGood % 5 === 0) await Haptics.selectionAsync();
                    }
                  }
                }
              } catch (e) {
                // Failures here are not fatal; fall back to thumbnail extraction after recording
                fallbackToThumbnail = true;
                console.warn('Live takePictureAsync failed, will fallback to thumbnail extraction:', e.message || e);
                break;
              }
            }
          } catch (err) {
            console.warn('Live capture loop error:', err.message || err);
          }

          // small sleep
          await new Promise(r => setTimeout(r, intervalMs));
        }

        // If we've reached enough frames while recording, stop recording early
        if (localGood >= MIN_GOOD_FRAMES && recordingActiveRef.current && typeof cameraRef.current.stopRecording === 'function') {
          try {
            cameraRef.current.stopRecording();
          } catch (e) {
            // ignore
          }
        }
      })();

      // Wait for recording to finish (either naturally or stopped above)
      const record = await recordPromise;

      // If live capture failed / not available, fall back to thumbnail extraction
      if (fallbackToThumbnail || frames.length === 0) {
        const times = [];
        const step = Math.max(1, Math.floor(VIDEO_RECORD_MS / EXTRACT_FRAMES));
        for (let t = 0; t < VIDEO_RECORD_MS; t += step) times.push(t);

        for (let i = 0; i < times.length; i += THUMBNAIL_BATCH) {
          if (stopBurstRef.current) break;
          const batch = times.slice(i, i + THUMBNAIL_BATCH);
          const thumbs = await Promise.all(batch.map(t => VideoThumbnails.getThumbnailAsync(record.uri, { time: t })).map(p => p.catch(() => null)));

          for (const thumb of thumbs) {
            if (stopBurstRef.current) break;
            if (!thumb || !thumb.uri) continue;

            let hasFace = false;
            try {
              if (FaceDetector && FaceDetector.detectFacesAsync) {
                const detection = await FaceDetector.detectFacesAsync(thumb.uri, {
                  mode: FaceDetector.Constants.Mode.fast,
                  detectLandmarks: FaceDetector.Constants.Landmarks.none,
                  runClassifications: FaceDetector.Constants.Classifications.all,
                });
                if (detection && Array.isArray(detection.faces) && detection.faces.length > 0) {
                  const f = detection.faces[0];
                  const left = f.leftEyeOpenProbability ?? null;
                  const right = f.rightEyeOpenProbability ?? null;
                  if ((left !== null && left > 0.3) || (right !== null && right > 0.3) || (left === null && right === null)) {
                    hasFace = true;
                  }
                }
              } else {
                hasFace = true;
              }
            } catch (e) {
              hasFace = true;
            }

            if (!hasFace) continue;

            const processed = await manipulateAsync(
              thumb.uri,
              [{ resize: { width: 480 } }],
              { compress: 0.5, format: SaveFormat.JPEG, base64: true }
            );
            const snippetHash = hashBase64Snippet(processed.base64);
            if (seenHashesRef.current.has(snippetHash)) {
              // duplicate, skip
            } else if (!isLikelySharp(processed.base64)) {
              // likely blurry, skip
            } else {
              seenHashesRef.current.add(snippetHash);
              frames.push(processed.base64);
              setBurstCount(prev => prev + 1);
              localGood++;
              setGoodFrameCount(localGood);
            }

            if (localGood >= MIN_GOOD_FRAMES || frames.length >= TOTAL_IMAGES) break; 
          }

          if (localGood >= MIN_GOOD_FRAMES || frames.length >= TOTAL_IMAGES) break;
        }
      }

      if (!record || !record.uri) throw new Error('Failed to record video');

      if (frames.length > 0) {
        await enrollFace(frames, { selectTop: 10, weights: { frontalness: 0.4, sharpness: 0.3, area: 0.2, quality: 0.1 }, preview: true, previewImages: false });
      } else {
        Alert.alert('Error', 'No good frames extracted from video');
      }


    } catch (err) {
      // If user cancelled by stopping the recording, the error may be a normal cancellation - show friendly message for other errors
      const msg = (err && err.message) ? err.message : String(err);
      if (!msg.includes('No permissions') && !msg.includes('cancel')) {
        Alert.alert('Error', msg);
      }
    } finally {
        // Ensure recording flags are cleared
      recordingActiveRef.current = false;
      currentRecordingRef.current = null;
      setIsBursting(false);
      setGoodFrameCount(0);
      setLastFace(null);
      seenHashesRef.current = new Set();
    }
  };

  /** ------------------ CANCEL ------------------ **/
  const cancelBurst = () => {
    stopBurstRef.current = true;

    // If a recording is active, stop it via camera API
    if (recordingActiveRef.current && cameraRef.current && typeof cameraRef.current.stopRecording === 'function') {
      try {
        cameraRef.current.stopRecording();
      } catch (e) {
        console.warn('stopRecording failed:', e.message || e);
      }
    }

    setIsBursting(false);
    setBurstCount(0);
    setGoodFrameCount(0);
    setLastFace(null);
    seenHashesRef.current = new Set();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  /** ------------------ API CALL ------------------ **/
  const enrollFace = async (images, opts = {}) => {
    try {
      const payload = {
        employeeId: employee._id,
        images: images.map(img => `data:image/jpeg;base64,${img}`),
        selectTop: opts.selectTop || 10,
        weights: opts.weights || { frontalness: 0.4, sharpness: 0.3, area: 0.2, quality: 0.1 },
        preview: !!opts.preview,
        previewImages: !!opts.previewImages
      };

      const { data } = await ApiService.makeAuthenticatedRequest(
        API_CONFIG.ENDPOINTS.ENROLL_FACE,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (data?.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          `Face enrolled using ${images.length} images`,
          [{ text: 'OK', onPress: onBack }]
        );
        // Invalidate local face cache so clients refresh their templates
        try {
          await AsyncStorage.removeItem('faceCacheLastSync');
        } catch (e) {
          console.warn('Failed to clear face cache timestamp after enrollment:', e);
        }
      } else {
        throw new Error(data?.message || 'Enrollment failed');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  /** ------------------ PERMISSIONS ------------------ **/
  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text>Camera permission required</Text>
      </View>
    );
  }

  /** ------------------ UI ------------------ **/
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient 
        colors={theme.colors.gradientDark} 
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Face Enrollment</Text>
            <Text style={styles.subtitle}>{employee?.name} • {employee?.empId}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          onCameraReady={() => setCameraReady(true)}
          onFacesDetected={FaceDetector ? handleFacesDetected : undefined}
          faceDetectorSettings={FaceDetector ? {
            mode: FaceDetector.Constants.Mode.fast,
            detectLandmarks: FaceDetector.Constants.Landmarks.none,
            runClassifications: FaceDetector.Constants.Classifications.all
          } : undefined}
        />

        <View style={styles.overlay}>
          <View style={styles.faceFrame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: lastFace ? '#00FFAA' : '#FF5A67' }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: lastFace ? '#00FFAA' : '#FF5A67' }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: lastFace ? '#00FFAA' : '#FF5A67' }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: lastFace ? '#00FFAA' : '#FF5A67' }]} />
          </View>

          <Animated.View style={[styles.instructionBubble, { opacity: fadeAnim }]}>
            <Text style={styles.instructionText}>
              {isBursting
                ? (FaceDetector && !lastFace 
                    ? 'No face detected - align your face' 
                    : 'Hold still')
                : 'Tap Capture & Stay Still'}
            </Text>
          </Animated.View>

          <Text style={styles.hint}>
            {FaceDetector
              ? (lastFace ? 'Face detected — hold still' : 'No face detected — align your face inside the frame')
              : 'Face detection not available in Expo Go'}
          </Text>
        </View>
      </View>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { 
              width: isBursting 
                ? `${Math.min(100, Math.round((burstCount / TOTAL_IMAGES) * 100))}%`
                : `${Math.min(100, Math.round((goodFrameCount / MIN_GOOD_FRAMES) * 100))}%`,
              backgroundColor: '#00FFAA'
            }]} />
          </View>
          <Text style={styles.progressText}>
            {isBursting 
            //   ? `Captured: ${burstCount}/${TOTAL_IMAGES}` 
              ? `Capturing` 
              : `Good frames: ${goodFrameCount}/${MIN_GOOD_FRAMES}`}
          </Text>
        </View>

        <View style={styles.buttonRow}>
            <TouchableOpacity
            style={[styles.captureButton, isBursting && styles.disabledButton]}
            onPress={startVideoCapture}
            disabled={!cameraReady || isBursting}
          >
            <View style={styles.captureGradient}>
              {isBursting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="videocam" size={22} color="#fff" />
                  {/* <Text style={styles.captureText}>Record</Text> */}
                </>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, isBursting && styles.disabledButton]}
            onPress={startBurstCapture}
            disabled={!cameraReady || isBursting}
          >
            <View style={styles.captureGradient}>
              {isBursting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="camera" size={22} color="#fff" />
                  {/* <Text style={styles.captureText}>Burst</Text> */}
                </>
              )}
            </View>
          </TouchableOpacity>          

          {isBursting && (
            <TouchableOpacity style={styles.captureButton} onPress={cancelBurst}>
              <View style={styles.captureGradient}>
                <Ionicons name="close" size={22} color="#fff" />
                {/* <Text style={styles.captureText}>Cancel</Text> */}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setCameraFacing(f => (f === 'front' ? 'back' : 'front'))}
      >
        <Ionicons name="camera-reverse" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default FaceEnrollmentScreen1;

/** ------------------ STYLES ------------------ **/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 10,
    borderBottomLeftRadius: theme.borderRadius.xl, 
    borderBottomRightRadius: theme.borderRadius.xl, 
    paddingHorizontal: theme.spacing.lg, 
    paddingBottom: theme.spacing.lg, 
    ...theme.shadows.lg 
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { 
    padding: theme.spacing.md, 
    borderRadius: theme.borderRadius.full, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    ...theme.shadows.sm 
  },
  headerTextContainer: { flex: 1, marginLeft: theme.spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)', 
    marginTop: 2, 
    fontWeight: '500' 
  },
  cameraContainer: { flex: 1, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    gap: 20,
  },
  faceFrame: { width: width * 0.7, height: width * 0.9, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40 },
  cornerTL: { 
    top: 0, left: 0, 
    borderTopWidth: 5, borderLeftWidth: 5, 
    borderTopLeftRadius: 16 
  },
  cornerTR: { 
    top: 0, right: 0, 
    borderTopWidth: 5, borderRightWidth: 5, 
    borderTopRightRadius: 16 
  },
  cornerBL: { 
    bottom: 0, left: 0, 
    borderBottomWidth: 5, borderLeftWidth: 5, 
    borderBottomLeftRadius: 16 
  },
  cornerBR: { 
    bottom: 0, right: 0, 
    borderBottomWidth: 5, borderRightWidth: 5, 
    borderBottomRightRadius: 16 
  },
  instructionBubble: { 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    paddingHorizontal: theme.spacing.md, 
    paddingVertical: theme.spacing.sm, 
    borderRadius: theme.borderRadius.xl, 
    alignItems: 'center',
    ...theme.shadows.lg 
  },
  instructionText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    textAlign: 'center' 
  },
  hint: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.9,
    textAlign: 'center',
  },
  bottomContainer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    padding: theme.spacing.lg, 
    backgroundColor: '#0000001f', 
    borderTopLeftRadius: theme.borderRadius.xl, 
    borderTopRightRadius: theme.borderRadius.xl, 
    // ...theme.shadows.lg, 
    borderWidth: 1, 
    borderColor: theme.colors.border 
  },
  progressContainer: { marginBottom: theme.spacing.md },
  progressBar: { 
    height: 8, 
    backgroundColor: theme.colors.border, 
    borderRadius: theme.borderRadius.full, 
    overflow: 'hidden', 
    marginBottom: theme.spacing.sm 
  },
  progressFill: { height: '100%', borderRadius: theme.borderRadius.full },
  progressText: { 
    fontSize: 14, 
    color: theme.colors.textSecondary, 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  captureButton: { 
    flex: 1,
    // padding: theme.spacing.md, 
    borderRadius: theme.borderRadius.full, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    ...theme.shadows.sm,
    overflow: 'hidden', 
  },
  cancelButton: {
    borderRadius: theme.borderRadius.full, 
    overflow: 'hidden', 
    ...theme.shadows.sm 
  },
  disabledButton: { opacity: 0.5 },
  captureGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: theme.spacing.md, 
    gap: theme.spacing.sm 
  },
  captureText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  floatingButton: { 
    position: 'absolute', 
    top: 150, 
    right: theme.spacing.lg, 
    // backgroundColor: 'rgba(0,0,0,0.6)',
    // borderRadius: theme.borderRadius.full,
    // padding: theme.spacing.md,
    // ...theme.shadows.glow 
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
