import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.skeleton, { width, height, borderRadius, opacity }, style]} />
  );
};

export const SkeletonCard = () => (
  <View style={styles.card}>
    <Skeleton width={60} height={60} borderRadius={30} style={{ marginBottom: 12 }} />
    <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
    <Skeleton width="60%" height={12} />
  </View>
);

const styles = StyleSheet.create({
  skeleton: { backgroundColor: '#334155' },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, margin: 8, alignItems: 'center' }
});
