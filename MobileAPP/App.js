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
import FaceEnrollmentScreen from './components/FaceEnrollmentScreen1';
import SplashScreen from './components/SplashScreen';
import ApiService from './services/ApiService';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
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
  };

  const handleLogout = async () => {
    await ApiService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setCurrentScreen('home');
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
    return null; // Or a loading screen
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={handleLogin} />
        <StatusBar style="light" />
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
        return <HomeScreen onNavigate={navigateToScreen} user={user} onLogout={handleLogout} />;
    }
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
