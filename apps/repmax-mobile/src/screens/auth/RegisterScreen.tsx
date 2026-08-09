// ============================================================
// RepMAX Business Suite — Registro final, hereda las elecciones
// del onboarding (país, vehículo, tipo de negocio, tema)
// ============================================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { THEMES } from '../../constants/onboarding';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// Genera un slug simple a partir del nombre de la tienda
function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // sin tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { state: onboardingState } = useOnboarding();

  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const temaElegido = THEMES.find(t => t.key === onboardingState.theme);
  const colorAcento = temaElegido?.color ?? colors.brand.orange;

  const handleRegister = async () => {
    if (!storeName.trim() || !email.trim() || !password) {
      setError('Completa todos los campos, mijo');
      return;
    }
    if (!onboardingState.country || !onboardingState.vehicleType ||
        !onboardingState.businessType || !onboardingState.theme) {
      setError('Faltan datos del onboarding — vuelve a intentar desde el inicio');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await register({
        email: email.trim(),
        password,
        storeName: storeName.trim(),
        storeSlug: slugify(storeName),
        storeType: onboardingState.businessType === 'PARTS_STORE'
          ? 'repuesteria'
          : onboardingState.businessType === 'WORKSHOP'
            ? 'taller'
            : 'ambos',
        vehicleFocus: onboardingState.vehicleType,
        theme: onboardingState.theme,
        country: onboardingState.country,
      });
      // onAuthStateChange en AuthContext dispara el login → AppNavigator navega a Main
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Crea tu cuenta</Text>
      <Text style={styles.subtitulo}>
        Tema <Text style={{ color: colorAcento }}>{temaElegido?.name}</Text> · listo para configurar
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre de tu tienda"
        placeholderTextColor={colors.text.disabled}
        value={storeName}
        onChangeText={setStoreName}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Correo"
        placeholderTextColor={colors.text.disabled}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={colors.text.disabled}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.boton, { backgroundColor: colorAcento }, isLoading && styles.botonDeshabilitado]}
        onPress={handleRegister}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading
          ? <ActivityIndicator color={colors.text.inverse} />
          : <Text style={styles.botonTexto}>Crear cuenta</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.base, justifyContent: 'center' },
  titulo: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], color: colors.text.primary, marginBottom: spacing.xs },
  subtitulo: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.text.secondary, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.bg.secondary, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.bg.border,
    padding: spacing.md, color: colors.text.primary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.md,
    marginBottom: spacing.md,
  },
  error: { color: colors.semantic.error, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, marginBottom: spacing.md },
  boton: { borderRadius: borderRadius.lg, paddingVertical: spacing.base, alignItems: 'center', marginTop: spacing.sm },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md, color: colors.text.inverse },
  link: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.brand.orange, textAlign: 'center', marginTop: spacing.lg },
});
