import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ onNavigate, user, onLogout }) {
  const insets = useSafeAreaInsets();

  const features = [
    { id: 'barcode', title: 'QR Scanner', subtitle: 'Quick scan', icon: 'qr-code', gradient: ['#8B5CF6', '#7C3AED'] },
    { id: 'faceRecognition', title: 'Face Scan', subtitle: 'AI recognition', icon: 'scan-circle', gradient: ['#EC4899', '#DB2777'] },
    { id: 'faceEnrollmentList', title: 'Enroll Face', subtitle: 'Register new', icon: 'person-add', gradient: ['#10B981', '#059669'] },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={theme.colors.gradientDark} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance System</Text>
          <View style={styles.grid}>
            {features.map((feature) => (
              <TouchableOpacity key={feature.id} onPress={() => onNavigate(feature.id)} style={styles.featureCard} activeOpacity={0.8}>
                <LinearGradient colors={feature.gradient} style={styles.featureGradient}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={feature.icon} size={36} color="#fff" />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                  <View style={styles.cardGlow} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>Security Tips</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipDot} />
            <Text style={styles.infoText}>Good lighting improves accuracy</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipDot} />
            <Text style={styles.infoText}>Hold device steady while scanning</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipDot} />
            <Text style={styles.infoText}>Face enrollment takes 30 seconds</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, borderBottomLeftRadius: theme.borderRadius.xl, borderBottomRightRadius: theme.borderRadius.xl, ...theme.shadows.lg },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  userName: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  logoutButton: { padding: theme.spacing.md, borderRadius: theme.borderRadius.full, backgroundColor: 'rgba(255,255,255,0.15)', ...theme.shadows.sm },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  section: { marginTop: theme.spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.sm },
  featureCard: { width: (width - theme.spacing.lg * 2 - theme.spacing.sm * 2) / 2, margin: theme.spacing.sm, borderRadius: theme.borderRadius.xl, overflow: 'hidden', ...theme.shadows.lg },
  featureGradient: { padding: theme.spacing.lg, alignItems: 'center', minHeight: 170, justifyContent: 'center', position: 'relative' },
  iconContainer: { width: 72, height: 72, borderRadius: theme.borderRadius.full, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md, ...theme.shadows.md },
  featureTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  featureSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center', fontWeight: '500' },
  cardGlow: { position: 'absolute', top: -50, right: -50, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)', opacity: 0.5 },
  infoCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, marginVertical: theme.spacing.xl, ...theme.shadows.md, borderWidth: 1, borderColor: theme.colors.border },
  infoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  infoTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginLeft: theme.spacing.sm },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, marginRight: theme.spacing.md },
  infoText: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, flex: 1 },
});