/**
 * LoginScreen — Pantalla de login rediseñada con identidad Lunaris.
 *
 * Comportamiento visual:
 * - Usa OnboardingLayout (mismo bg #111318, SafeArea, scroll con KeyboardAvoiding)
 * - Hero: logo del tenant si config.logo existe → Image circular
 *         fallback: DiamondSparkle size={72}
 * - Bajo el hero: businessName del tenant en texto blanco + subtítulo muted
 * - Formulario en card glassmorphism (igual a OnboardingAuthScreen)
 * - CTA: GradientCTAButton primary con gradiente Lunaris (no botón blanco)
 * - Botón de huella al lado del CTA si biometría está habilitada
 * - Link inferior "¿No tienes cuenta? Crea tu negocio" → onCreateBusiness?()
 * - Botón "¿Olvidaste tu contraseña?" sutil entre campos y CTA
 * - Animaciones: FadeInUp para hero, FadeInDown para card y link
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { Feather, Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

import { ThemedText } from '@/components/ThemedText'
import { TenantLogoImage } from '@/components/TenantLogoImage'
import {
  OnboardingLayout,
  GradientCTAButton,
  DiamondSparkle,
} from '@/screens/onboarding/components'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useBiometricAuth } from '@/hooks/useBiometricAuth'
import { Colors, Onboarding, Spacing, BorderRadius, Gradients } from '@/constants/theme'

interface LoginScreenProps {
  onSuccess?: () => void
  onCreateBusiness?: () => void
}

const LOGO_SIZE = 80

export function LoginScreen({ onSuccess, onCreateBusiness }: LoginScreenProps = {}) {
  const { login } = useAuth()
  const { config } = useTenant()
  const {
    isAvailable,
    isEnabled,
    enableBiometric,
    authenticateWithBiometric,
    getBiometricTypeName,
  } = useBiometricAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLogo = Boolean(config.logo)
  const businessName = config.businessName || 'GeemaStudio'
  const showBiometricButton = isAvailable && isEnabled
  const busy = loading || biometricLoading

  const preguntarHabilitarBiometrica = useCallback(
    (emailActual: string, passwordActual: string) => {
      if (!isAvailable || isEnabled) return

      const tipo = getBiometricTypeName()
      Alert.alert(
        'Acceso rápido',
        `¿Deseas habilitar ${tipo} para acceder más rápido la próxima vez?`,
        [
          { text: 'No, gracias', style: 'cancel' },
          {
            text: 'Sí, habilitar',
            onPress: () => {
              void (async () => {
                const result = await enableBiometric(emailActual, passwordActual)
                if (!result.success) {
                  Alert.alert('Error', result.error || 'No se pudo habilitar el acceso rápido')
                } else {
                  Alert.alert('Listo', `${tipo} habilitado correctamente`)
                }
              })()
            },
          },
        ]
      )
    },
    [enableBiometric, getBiometricTypeName, isAvailable, isEnabled]
  )

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const emailTrim = email.trim()
      const result = await login(emailTrim, password)
      if (!result.ok) {
        setError(result.error ?? 'Error al iniciar sesión')
      } else {
        preguntarHabilitarBiometrica(emailTrim, password)
        onSuccess?.()
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    if (busy) return
    setError(null)
    setBiometricLoading(true)
    try {
      const result = await authenticateWithBiometric()
      if (result.success && result.email && result.password) {
        const loginResult = await login(result.email, result.password)
        if (!loginResult.ok) {
          setError(
            loginResult.error ??
              'Las credenciales guardadas no son válidas. Inicia sesión con correo y contraseña.'
          )
        } else {
          onSuccess?.()
        }
      } else if (result.error && result.error !== 'Autenticación cancelada') {
        setError(result.error)
      }
    } catch {
      setError('Error al autenticar con biometría. Intenta con tu contraseña.')
    } finally {
      setBiometricLoading(false)
    }
  }

  return (
    <OnboardingLayout scrollable>
      <View style={styles.inner}>
        <Animated.View entering={FadeInUp.duration(500)} style={styles.heroWrap}>
          {hasLogo ? (
            <TenantLogoImage
              uri={config.logo as string}
              size={LOGO_SIZE}
              bgStyle={config.logoBgDark}
              style={styles.logoImage}
              borderColor="rgba(255,255,255,0.15)"
            />
          ) : (
            <DiamondSparkle size={72} />
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(80)} style={styles.brandText}>
          <ThemedText style={styles.businessName}>{businessName}</ThemedText>
          <ThemedText style={styles.brandSub}>Ingresa a tu panel</ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(160)} style={styles.card}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Correo electrónico</ThemedText>
            <View style={styles.inputWrapper}>
              <Feather
                name="mail"
                size={18}
                color="rgba(255,255,255,0.4)"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={email}
                onChangeText={(t) => {
                  setEmail(t)
                  setError(null)
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!busy}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Contraseña</ThemedText>
            <View style={styles.inputWrapper}>
              <Feather
                name="lock"
                size={18}
                color="rgba(255,255,255,0.4)"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={(t) => {
                  setPassword(t)
                  setError(null)
                }}
                secureTextEntry={!showPassword}
                editable={!busy}
              />
              <Pressable
                onPress={() => setShowPassword((p) => !p)}
                style={styles.eyeButton}
                hitSlop={12}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color="rgba(255,255,255,0.5)"
                />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.forgotWrap}>
            <ThemedText style={styles.forgotText}>¿Olvidaste tu contraseña?</ThemedText>
          </Pressable>

          {error ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color={Colors.dark.error} />
              <ThemedText style={[styles.errorText, { color: Colors.dark.error }]}>
                {error}
              </ThemedText>
            </Animated.View>
          ) : null}

          <View style={styles.ctaRow}>
            <GradientCTAButton
              label="Entrar al panel"
              icon="arrow-right"
              onPress={handleLogin}
              loading={loading}
              disabled={busy}
              style={styles.ctaFlex}
            />
            {showBiometricButton ? (
              <Pressable
                onPress={handleBiometricLogin}
                disabled={busy}
                accessibilityLabel={`Entrar con ${getBiometricTypeName()}`}
                style={({ pressed }) => [
                  styles.biometricButton,
                  { opacity: pressed || busy ? 0.75 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[...Gradients.onboarding.colors]}
                  locations={[...Gradients.onboarding.locations]}
                  start={Gradients.onboarding.linearStart}
                  end={Gradients.onboarding.linearEnd}
                  style={styles.biometricGradient}
                >
                  {biometricLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="finger-print" size={28} color="#fff" />
                  )}
                </LinearGradient>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        {onCreateBusiness ? (
          <Animated.View entering={FadeInDown.duration(500).delay(240)} style={styles.createWrap}>
            <ThemedText style={styles.createText}>
              ¿No tienes cuenta?{' '}
              <ThemedText style={styles.createLink} onPress={onCreateBusiness}>
                Crea tu negocio
              </ThemedText>
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>
    </OnboardingLayout>
  )
}

const styles = StyleSheet.create({
  inner: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    paddingBottom: Spacing['2xl'],
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  logoImage: {},
  brandText: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  businessName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: Spacing.lg,
  },
  inputGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: 48, fontSize: 15, color: '#FFFFFF' },
  passwordInput: { paddingRight: 36 },
  eyeButton: { padding: Spacing.xs },
  forgotWrap: {
    alignItems: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  forgotText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.dark.error + '15',
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ctaFlex: { flex: 1, marginTop: 0 },
  biometricButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  biometricGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  createWrap: { alignItems: 'center', marginTop: Spacing.lg },
  createText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  createLink: { color: Onboarding.lunarisAccent, fontWeight: '600' },
})
