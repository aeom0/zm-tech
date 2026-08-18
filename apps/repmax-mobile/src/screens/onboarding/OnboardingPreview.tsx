// ============================================================
// RepMAX Business Suite — Preview del dashboard con tema aplicado (paso 5)
// Mock visual que refleja las elecciones del usuario
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { THEMES, VEHICLE_DASHBOARD_ICON } from '../../constants/onboarding';
import OnboardingProgressBar from '../../components/onboarding/OnboardingProgressBar';
import { Screen } from '../../components/layout/Screen';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPreview'>;

// Iconos de la tab bar simulada (5 tabs: Inicio, Ventas, Stock, Clientes, Más)
const TAB_ICONS = ['home-outline', 'cart-outline', 'package-variant-closed', 'account-group-outline', 'menu'];

/** Filas ficticias de actividad reciente (solo mock visual) */
const FILAS_ACTIVIDAD_MOCK = [
  {
    icono: 'cart-outline' as const,
    descripcion: 'Venta POS',
    hora: 'hace 5 min',
    monto: '$45.00',
  },
  {
    icono: 'package-variant-closed' as const,
    descripcion: 'Stock actualizado',
    hora: 'hace 1h',
    monto: '8 items',
  },
  {
    icono: 'account-plus-outline' as const,
    descripcion: 'Nuevo cliente',
    hora: 'hace 2h',
    monto: '—',
  },
];

export default function OnboardingPreview(_props: Props) {
  const { state, completeOnboarding } = useOnboarding();
  const opacidadMock = useRef(new Animated.Value(0)).current;
  const translateYMock = useRef(new Animated.Value(24)).current;

  // Al llamar completeOnboarding(), state.completed pasa a true.
  // AppNavigator observa ese cambio y renderiza Auth (Register) automáticamente
  // sin necesidad de navegar manualmente — evita errores de pantalla no registrada.
  const handleFinalizar = async () => {
    try {
      await completeOnboarding();
    } catch (error) {
      console.error('[OnboardingPreview] Error al completar onboarding:', error);
    }
  };

  // Entrada del mock del dashboard
  useEffect(() => {
    const animacion = Animated.parallel([
      Animated.timing(translateYMock, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacidadMock, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animacion.start();
    return () => {
      animacion.stop();
    };
  }, [opacidadMock, translateYMock]);

  // Color de acento según tema seleccionado (default naranja)
  const temaActual = THEMES.find(t => t.key === state.theme);
  const colorAcento = temaActual?.color ?? colors.brand.orange;
  const iconVehiculo = VEHICLE_DASHBOARD_ICON[state.vehicleType ?? 'BOTH'];

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      {/* Barra de progreso: paso 5 de 5 */}
      <OnboardingProgressBar currentStep={5} totalSteps={5} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>Así luce tu tienda</Text>
        <Text style={styles.subtitulo}>
          Tu panel personalizado con tema{' '}
          <Text style={{ color: colorAcento }}>{temaActual?.name ?? 'Turbo'}</Text>
        </Text>

        {/* Mock del Dashboard */}
        <Animated.View
          style={[
            styles.mockContenedor,
            shadows.md,
            {
              opacity: opacidadMock,
              transform: [{ translateY: translateYMock }],
            },
          ]}
        >
          {/* Header del mock */}
          <View style={[styles.mockHeader, { backgroundColor: colorAcento }]}>
            <View style={styles.mockHeaderIzq}>
              <MaterialCommunityIcons name={iconVehiculo as never} size={18} color="#FFFFFF" />
              <Text style={styles.mockHeaderTexto}>Mi Tienda</Text>
            </View>
            <Text style={styles.mockHeaderSub}>Dashboard</Text>
          </View>

          {/* KPI cards con datos placeholder verosímiles */}
          <View style={styles.mockKpis}>
            <View style={[styles.kpiCard, { borderLeftColor: colorAcento }]}>
              <Text style={styles.kpiLabel}>Ventas hoy</Text>
              <Text style={[styles.kpiValor, { color: colorAcento }]}>$324.00</Text>
              <Text style={styles.kpiSub}>+3 ventas</Text>
            </View>
            <View style={[styles.kpiCard, { borderLeftColor: colorAcento }]}>
              <Text style={styles.kpiLabel}>Productos</Text>
              <Text style={[styles.kpiValor, { color: colorAcento }]}>47</Text>
              <Text style={styles.kpiSub}>12 categorías</Text>
            </View>
          </View>

          {/* Actividad reciente (mock) */}
          <Text style={styles.actividadEncabezado}>Actividad reciente</Text>
          {FILAS_ACTIVIDAD_MOCK.map((fila, indice) => (
            <View
              key={`${fila.descripcion}-${indice}`}
              style={[
                styles.actividadFila,
                indice < FILAS_ACTIVIDAD_MOCK.length - 1 && styles.actividadFilaConBorde,
              ]}
            >
              <View style={styles.actividadIconoCirculo}>
                <View
                  style={[
                    styles.actividadIconoFondo,
                    { backgroundColor: colorAcento },
                  ]}
                />
                <MaterialCommunityIcons
                  name={fila.icono as never}
                  size={16}
                  color={colorAcento}
                />
              </View>
              <View style={styles.actividadTextos}>
                <Text style={styles.actividadDescripcion}>{fila.descripcion}</Text>
                <Text style={styles.actividadHora}>{fila.hora}</Text>
              </View>
              <Text style={[styles.actividadMonto, { color: colorAcento }]}>{fila.monto}</Text>
            </View>
          ))}

          {/* Tab bar simulada con iconos reales */}
          <View style={styles.mockTabBar}>
            {TAB_ICONS.map((icono, i) => (
              <View key={i} style={styles.mockTab}>
                <MaterialCommunityIcons
                  name={icono as never}
                  size={20}
                  color={i === 0 ? colorAcento : colors.text.disabled}
                />
                {i === 0 && (
                  <View style={[styles.mockTabIndicador, { backgroundColor: colorAcento }]} />
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Botón final */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.boton, { backgroundColor: colorAcento }]}
          onPress={handleFinalizar}
          activeOpacity={0.85}
        >
          <Text style={styles.botonTexto}>Se ve brutal — ¡empecemos!</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing.lg,
  },
  titulo: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  subtitulo: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  // Mock del Dashboard
  mockContenedor: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  mockHeader: {
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockHeaderIzq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mockHeaderTexto: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: '#FFFFFF',
  },
  mockHeaderSub: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  mockKpis: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  kpiLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValor: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
  },
  kpiSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actividadEncabezado: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  actividadFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  actividadFilaConBorde: {
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  actividadIconoCirculo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actividadIconoFondo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    opacity: 0.15,
  },
  actividadTextos: {
    flex: 1,
  },
  actividadDescripcion: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  actividadHora: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  actividadMonto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
  },
  mockTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
    paddingVertical: spacing.sm,
  },
  mockTab: {
    flex: 1,
    alignItems: 'center',
  },
  mockTabIndicador: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  // Footer
  footer: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
  },
  boton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  botonTexto: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: '#FFFFFF',
  },
});
