// ============================================================
// RepMAX Business Suite — Pantalla de Login
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSlugFromName = (name: string) => {
    setStoreName(name);
    setStoreSlug(
      name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    );
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Email y contraseña son obligatorios.');
      return;
    }
    if (mode === 'register' && (!storeName.trim() || !storeSlug.trim())) {
      Alert.alert('Campos requeridos', 'Nombre y slug de la tienda son obligatorios.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, storeName.trim(), storeSlug.trim());
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ocurrió un error. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.logo}>Rep<Text style={styles.logoAccent}>MAX</Text></Text>
          <Text style={styles.tagline}>Business Suite</Text>
          <Text style={styles.subtitle}>Gestión inteligente para autopartes</Text>
        </View>

        {/* Card del formulario */}
        <View style={styles.card}>
          {/* Selector de modo */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
                Registrarse
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campos comunes */}
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="admin@tutienda.com"
            placeholderTextColor={colors.text.disabled}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.text.disabled}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Campos solo para registro */}
          {mode === 'register' && (
            <>
              <Text style={styles.label}>Nombre de tu tienda</Text>
              <TextInput
                style={styles.input}
                placeholder="Autopartes El Turbo"
                placeholderTextColor={colors.text.disabled}
                value={storeName}
                onChangeText={handleSlugFromName}
              />

              <Text style={styles.label}>Slug (URL única)</Text>
              <TextInput
                style={styles.input}
                placeholder="autopartes-el-turbo"
                placeholderTextColor={colors.text.disabled}
                value={storeSlug}
                onChangeText={setStoreSlug}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Solo letras minúsculas, números y guiones.</Text>
            </>
          )}

          {/* Botón principal */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>RepMAX · Venezuela 🇻🇪</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.base,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    fontSize: typography.size['4xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    letterSpacing: 4,
  },
  logoAccent: {
    color: colors.brand.orange,
  },
  tagline: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md - 2,
  },
  modeBtnActive: {
    backgroundColor: colors.brand.orange,
  },
  modeBtnText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  modeBtnTextActive: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.semibold,
  },
  label: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  hint: {
    color: colors.text.disabled,
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  submitBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
  footer: {
    textAlign: 'center',
    color: colors.text.disabled,
    fontSize: typography.size.xs,
    marginTop: spacing.xl,
  },
});
