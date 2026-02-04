import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, StatusBar, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/apiConfig';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const FaceEnrollmentList = ({ onBack, onSelectEmployee }) => {
  const insets = useSafeAreaInsets();
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(await API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.EMPLOYEES), {
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
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'Server is taking too long to respond. Please try again.', [
          { text: 'Retry', onPress: fetchEmployees },
          { text: 'Cancel', style: 'cancel' }
        ]);
      } else {
        Alert.alert('Error', `Network error: ${error.message}`);
      }
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
      style={styles.employeeCard}
      onPress={() => onSelectEmployee(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.employeeId}>EMP ID: {item.empId}</Text>
      </View>
      {item.faceEnrolled && (
        <View style={styles.enrolledBadge}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.colors.gradientDark} style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Employee</Text>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : filteredEmployees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>
            {employees.length === 0 ? 'No active employees found' : 'No matching employees'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.countContainer}>
            <Ionicons name="people" size={16} color={theme.colors.primary} />
            <Text style={styles.countText}>
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployee}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, borderBottomLeftRadius: theme.borderRadius.xl, borderBottomRightRadius: theme.borderRadius.xl, ...theme.shadows.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: theme.spacing.md, borderRadius: theme.borderRadius.full, backgroundColor: 'rgba(255,255,255,0.15)', ...theme.shadows.sm, marginRight: theme.spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: theme.colors.text },
  clearButton: { padding: theme.spacing.sm },
  countContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  countText: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: theme.spacing.sm, fontWeight: '600' },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  employeeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, ...theme.shadows.md, borderWidth: 1, borderColor: theme.colors.border },
  avatarContainer: { position: 'relative', marginRight: theme.spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.background },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  enrolledBadge: { position: 'absolute', top: 16, left: 60, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.surface },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  employeeId: { fontSize: 14, color: theme.colors.textSecondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: theme.spacing.md, fontSize: 16, color: theme.colors.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  emptyText: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md },
});

export default FaceEnrollmentList;