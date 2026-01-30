import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export const Button = ({ title, onPress, variant = 'primary', icon, loading, disabled, style }) => {
  const buttonStyle = variant === 'primary' ? styles.primaryButton : 
                      variant === 'secondary' ? styles.secondaryButton : 
                      styles.outlineButton;

  if (variant === 'gradient') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[styles.button, style]}>
        <LinearGradient colors={theme.colors.gradient} style={[styles.button, styles.gradientButton]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={20} color="#fff" style={styles.icon} />}
              <Text style={styles.primaryText}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading}
      style={[styles.button, buttonStyle, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.colors.primary} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={variant === 'outline' ? theme.colors.primary : '#fff'} style={styles.icon} />}
          <Text style={variant === 'outline' ? styles.outlineText : styles.primaryText}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const IconButton = ({ icon, onPress, color = theme.colors.primary, size = 24, style }) => (
  <TouchableOpacity onPress={onPress} style={[styles.iconButton, style]}>
    <Ionicons name={icon} size={size} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.glow,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  gradientButton: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceLight,
    ...theme.shadows.sm,
  },
});