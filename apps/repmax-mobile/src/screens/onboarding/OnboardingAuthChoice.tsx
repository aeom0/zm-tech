// ============================================================
// RepMAX Business Suite — Pantalla inicial: login o crear cuenta
// Reemplaza el antiguo arranque directo en ONB-02-Pais. 'Crear cuenta'
// entra al wizard de personalización; 'Iniciar sesión' va directo al
// login, sin pasar por onboarding.
// ============================================================

import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { BrandLogo } from '../../components/brand/BrandLogo'
import { Screen } from '../../components/layout/Screen'
import { useAuth } from '../../context/AuthContext'
import { useOnboarding } from '../../context/OnboardingContext'
import { colors, typography, spacing, borderRadius } from '../../utils/theme'

// Owner de Repuestos Alfa — ver docs/repmax/supabase/seed/demo_users.md
const DEMO_EMAIL = 'repmax-owner-a@test.local'
const DEMO_PASSWORD = 'TestRepmax123!'

interface Props {
  onChooseSignUp: () => void
  onChooseLogin: () => void
}

export default function OnboardingAuthChoice({ onChooseSignUp, onChooseLogin }: Props) {
  const { login } = useAuth()
  const { completeOnboarding } = useOnboarding()
  const [cargandoDemo, setCargandoDemo] = useState(false)

  const handleExplorarDemo = async () => {
    setCargandoDemo(true)
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD)
      await completeOnboarding()
    } catch (error) {
      console.error('[OnboardingAuthChoice] Error al cargar usuario demo:', error)
      Alert.alert(
        'No se pudo entrar al demo',
        error instanceof Error ? error.message : 'Revisa la conexión o las credenciales demo.'
      )
    } finally {
      setCargandoDemo(false)
    }
  }

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BrandLogo variant="wordmark" width={220} />
          <Text style={styles.titulo}>Gestiona tu tienda{'\n'}de repuestos</Text>
          <Text style={styles.subtitulo}>Inventario, ventas y catálogo en un solo lugar.</Text>
        </View>

        <View style={styles.botones}>
          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={onChooseSignUp}
            activeOpacity={0.85}
          >
            <Text style={styles.botonPrimarioTexto}>Crear cuenta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={onChooseLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.botonSecundarioTexto}>Iniciar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoLink}
            onPress={handleExplorarDemo}
            activeOpacity={0.7}
            disabled={cargandoDemo}
          >
            {cargandoDemo ? (
              <ActivityIndicator color={colors.brand.orange} size="small" />
            ) : (
              <Text style={styles.demoLinkTexto}>Explorar con demo</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.notaLegal}>
            Al continuar aceptas nuestros Términos y Política de Privacidad.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  titulo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['3xl'],
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: typography.size['3xl'] * typography.lineHeight.tight,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitulo: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  botones: {
    width: '100%',
    gap: spacing.md,
  },
  botonPrimario: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base + 4,
    alignItems: 'center',
  },
  botonPrimarioTexto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.inverse,
  },
  botonSecundario: {
    borderWidth: 2,
    borderColor: colors.bg.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base + 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  botonSecundarioTexto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  demoLink: {
    marginTop: spacing.md,
    alignItems: 'center',
    minHeight: 20,
    justifyContent: 'center',
  },
  demoLinkTexto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.brand.orange,
  },
  notaLegal: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.md,
  },
})
