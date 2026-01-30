import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './components/HomeScreen';
import LoginScreen from './components/LoginScreen';
import AttendanceScanner from './components/AttendanceScanner';
import FaceRecognitionScreen from './components/FaceRecognitionScreen';
import FaceEnrollmentList from './components/FaceEnrollmentList';
import FaceEnrollmentScreen from './components/FaceEnrollmentScreen';
import ApiService from './services/ApiService';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
