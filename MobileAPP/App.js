import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './components/HomeScreen';
import LoginScreen from './components/LoginScreen';
import AttendanceScanner from './components/AttendanceScanner';
import FaceRecognitionScreen from './components/FaceRecognitionScreen';
import FaceEnrollmentList from './components/FaceEnrollmentList';
import FaceEnrollmentScreen from './components/FaceEnrollmentScreen';
import SplashScreen from './components/SplashScreen';
import ApiService from './services/ApiService';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useApp } from './context/AppContext';
import { Toast } from './components/Toast';
import { SkeletonCard } from './components/Skeleton';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const { loading, setLoading, isDarkMode } = useApp();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');

      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    showToast('Login successful!', 'success');
  };

  const handleLogout = async () => {
    await ApiService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setCurrentScreen('home');
    showToast('Logged out successfully', 'info');
  };

  const navigateToScreen = (screen, employee = null) => {
    setCurrentScreen(screen);
    if (employee) setSelectedEmployee(employee);
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#000' : '#F9FAFB' }]}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={handleLogin} />
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'barcode':
        return <AttendanceScanner onBack={() => navigateToScreen('home')} />;
      case 'faceRecognition':
        return <FaceRecognitionScreen onBack={() => navigateToScreen('home')} />;
      case 'faceEnrollmentList':
        return <FaceEnrollmentList onBack={() => navigateToScreen('home')} onSelectEmployee={(emp) => navigateToScreen('faceEnrollment', emp)} />;
      case 'faceEnrollment':
        return <FaceEnrollmentScreen employee={selectedEmployee} onBack={() => navigateToScreen('faceEnrollmentList')} />;
      case 'profileView':
        return (
          <View style={styles.wipContainer}>
            <Ionicons name="construct-outline" size={80} color="#999" />
            <Text style={styles.wipTitle}>Work in Progress</Text>
            <Text style={styles.wipSubtitle}>
              This feature is under development.
            </Text>
            <TouchableOpacity onPress={() => navigateToScreen('home')}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return <HomeScreen onNavigate={navigateToScreen} user={user} onLogout={handleLogout} showToast={showToast} />;
    }
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  wipContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30
  },
  wipTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 20,
    color: '#333'
  },
  wipSubtitle: {
    fontSize: 16,
    marginTop: 8,
    color: '#777',
    textAlign: 'center'
  },
  backText: {
    marginTop: 25,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  }
});
