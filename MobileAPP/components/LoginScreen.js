import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/apiConfig';
import { theme } from '../theme';

const LoginScreen = ({ onLogin }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both Employee ID/Email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(await API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        await AsyncStorage.setItem('authToken', data.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
        onLogin(data.data.user, data.data.token);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.colors.gradientDark} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Image source={require('../assets/logo2.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Employee ID or Email"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={loading ? ['#6B7280', '#6B7280'] : [theme.colors.primary, '#7C3AED']} style={styles.buttonGradient}>
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...theme.shadows.lg },
  logo: { width: 200, height: 100, marginBottom: theme.spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  formContainer: { flex: 1, padding: theme.spacing.xl },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, height: 50, fontSize: 16, color: theme.colors.text },
  eyeIcon: { padding: theme.spacing.sm },
  button: { marginTop: theme.spacing.md, borderRadius: theme.borderRadius.md, overflow: 'hidden', ...theme.shadows.glow },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default LoginScreen;