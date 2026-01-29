import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const HomeScreen = ({ onNavigate, user, onLogout }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>HRM Attendance</Text>
        <Text style={styles.welcome}>Welcome, {user?.name}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => onNavigate('barcode')}
      >
        <Text style={styles.buttonText}>Barcode Scanner</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => onNavigate('faceRecognition')}
      >
        <Text style={styles.buttonText}>Face Recognition</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => onNavigate('faceEnrollmentList')}
      >
        <Text style={styles.buttonText}>Enroll Face</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  welcome: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;