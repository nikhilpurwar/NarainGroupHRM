import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FaceEnrollmentList = ({ onBack, onSelectEmployee }) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [searchText, employees]);

  const fetchEmployees = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch('https://naraingrouphrm.onrender.com/api/employees', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        const activeEmployees = data.data.filter(emp => 
          emp.status && emp.status.toLowerCase() === 'active'
        );
        setEmployees(activeEmployees);
        setFilteredEmployees(activeEmployees);
      } else {
        Alert.alert('Error', 'Invalid response format');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      const errorMessage = error.name === 'AbortError' 
        ? 'Request timeout. Please check your connection.' 
        : `Network error: ${error.message}`;
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    if (!searchText.trim()) {
      setFilteredEmployees(employees);
    } else {
      const search = searchText.toLowerCase();
      const filtered = employees.filter(emp => 
        (emp.name && emp.name.toLowerCase().includes(search)) ||
        (emp.empId && emp.empId.toLowerCase().includes(search))
      );
      setFilteredEmployees(filtered);
    }
  };

  const renderEmployee = ({ item }) => (
    <TouchableOpacity 
      style={styles.employeeItem}
      onPress={() => onSelectEmployee(item)}
    >
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name}</Text>
        <Text style={styles.employeeId}>ID: {item.empId}</Text>
      </View>
      {item.faceEnrolled && (
        <View style={styles.enrolledBadge}>
          <Text style={styles.enrolledText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Employee</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or ID..."
        value={searchText}
        onChangeText={setSearchText}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : filteredEmployees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {employees.length === 0 ? 'No active employees found' : 'No matching employees'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.countText}>
            {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
          </Text>
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployee}
            keyExtractor={(item) => item._id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  searchInput: {
    margin: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  countText: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontSize: 14,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  employeeItem: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  employeeId: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  enrolledBadge: {
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enrolledText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default FaceEnrollmentList;