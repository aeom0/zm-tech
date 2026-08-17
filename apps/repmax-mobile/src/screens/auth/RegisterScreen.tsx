// ============================================================
// RepMAX Business Suite — Registro final
// Hereda elecciones del onboarding; si faltan, usa defaults de BD.
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { Screen } from '../../components/layout/Screen';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { THEMES } from '../../constants/onboarding';
import { slugify } from '../../utils/slugify';
import { esSlugReservadoVitrina, esSlugVitrinaValido } from '@repmax/repmax-schema/vitrinaSlug';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import type { StoreType } from '../../types/database';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

function mapBusinessType(businessType: string | null): StoreType {
  if (businessType === 'PARTS_STORE') return 'repuesteria';
  if (businessType === 'WORKSHOP') return 'taller';
  if (businessType === 'BOTH') return 'ambos';
  return 'repuesteria';
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
  const storeSlug = useMemo(() => slugify(storeName), [storeName]);

  const handleRegister = async () => {
    if (!storeName.trim() || !email.trim() || !password) {
      setError('Completa todos los campos, mijo');
      return;
    }
    if (!storeSlug) {
      setError('El nombre de la tienda debe incluir letras o números para generar la URL.');
      return;
    }
    if (!esSlugVitrinaValido(storeSlug)) {
      setError(
        esSlugReservadoVitrina(storeSlug)
          ? 'Ese nombre está reservado. Probá otro para la URL de tu vitrina.'
          : 'Ese nombre no sirve para la URL. Usá letras, números o guiones.',
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await register({
        email: email.trim(),
        password,
        storeName: storeName.trim(),
        storeSlug,
        storeType: mapBusinessType(onboardingState.businessType),
        vehicleFocus: onboardingState.vehicleType ?? 'BOTH',
        theme: onboardingState.theme ?? 'turbo',
        country: onboardingState.country ?? 'VE',
      });
      // AuthContext.setState con membership → AppNavigator navega a Main
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.titulo}>Crea tu cuenta</Text>
          <Text style={styles.subtitulo}>
            {temaElegido
              ? <>Tema <Text style={{ color: colorAcento }}>{temaElegido.name}</Text> · listo para configurar</>
              : 'Configura tu tienda en segundos'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre de tu tienda"
            placeholderTextColor={colors.text.disabled}
            value={storeName}
            onChangeText={setStoreName}
            autoCapitalize="words"
          />
          {storeName.trim().length > 0 && (
            <Text style={styles.slugHint}>
              {storeSlug && esSlugVitrinaValido(storeSlug)
                ? `URL: /${storeSlug}`
                : storeSlug && esSlugReservadoVitrina(storeSlug)
                  ? 'Ese nombre está reservado. Probá otro.'
                  : 'Agrega letras o números para generar la URL'}
            </Text>
          )}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.base,
  },
  titulo: { fontFamily: typography.fontFamily.bold, fontSize: typography.size['2xl'], color: colors.text.primary, marginBottom: spacing.xs },
  subtitulo: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.base, color: colors.text.secondary, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.bg.secondary, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.bg.border,
    padding: spacing.md, color: colors.text.primary, fontFamily: typography.fontFamily.regular, fontSize: typography.size.md,
    marginBottom: spacing.md,
  },
  slugHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  error: { color: colors.semantic.error, fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, marginBottom: spacing.md },
  boton: { borderRadius: borderRadius.lg, paddingVertical: spacing.base, alignItems: 'center', marginTop: spacing.sm },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md, color: colors.text.inverse },
  link: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.brand.orange, textAlign: 'center', marginTop: spacing.lg },
});
