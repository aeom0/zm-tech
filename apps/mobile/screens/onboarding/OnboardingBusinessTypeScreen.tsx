import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { CurrencyPickerModal } from "@/screens/settings/components/CurrencyPickerModal";
import {
  BorderRadius,
  Colors,
  Gradients,
  Onboarding,
  Spacing,
} from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import {
  spaNavilsPreset,
  barbershopPreset,
  hairSalonPreset,
  fullAestheticPreset,
  type TenantConfig,
} from "@salonpro/tenant-config";
import { MONEDAS_LATAM, type Moneda } from "@/screens/settings/constants";

type BusinessType = TenantConfig["businessType"];

interface OnboardingBusinessTypeScreenProps {
  onNext: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (full.length !== 6) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const TIPOS = [
  {
    key: "spa-nails" as BusinessType,
    icon: "droplet" as const,
    nombre: "Spa / Uñas",
    descripcion: "Manicure, pedicure, tratamientos",
    preset: spaNavilsPreset,
  },
  {
    key: "barbershop" as BusinessType,
    icon: "user" as const,
    nombre: "Barbería",
    descripcion: "Cortes, barba, afeitado clásico",
    preset: barbershopPreset,
  },
  {
    key: "hair-salon" as BusinessType,
    icon: "scissors" as const,
    nombre: "Peluquería",
    descripcion: "Cortes, peinados, coloración",
    preset: hairSalonPreset,
  },
  {
    key: "full-aesthetic" as BusinessType,
    icon: "shield" as const,
    nombre: "Estética Integral",
    descripcion: "Servicios completos de belleza",
    preset: fullAestheticPreset,
  },
];

type SubtypeOpcion = {
  key: TenantConfig["businessSubtype"] | undefined;
  label: string;
};

const SUBTYPES: Partial<Record<BusinessType, SubtypeOpcion[]>> = {
  "spa-nails": [
    { key: undefined, label: "General" },
    { key: "brow-lash", label: "Cejas & Pestañas" },
    { key: "nails-only", label: "Solo Uñas" },
    { key: "spa-full", label: "Spa Completo" },
  ],
  barbershop: [
    { key: undefined, label: "General" },
    { key: "barber-lounge", label: "Barber Lounge" },
  ],
  "hair-salon": [
    { key: undefined, label: "General" },
    { key: "color-studio", label: "Color Studio" },
    { key: "multi-service", label: "Multi-Servicio" },
  ],
  "full-aesthetic": [
    { key: undefined, label: "General" },
    { key: "med-aesthetic", label: "Med-Estética" },
  ],
};

export default function OnboardingBusinessTypeScreen({
  onNext,
}: OnboardingBusinessTypeScreenProps) {
  const { config, updateTenant } = useTenant();

  // Estado local de selección — NO navega al instante.
  // El usuario selecciona el tipo y luego presiona "Continuar".
  const [tipoSeleccionado, setTipoSeleccionado] = useState<BusinessType>(
    config.businessType,
  );
  const [selectedSubtype, setSelectedSubtype] =
    useState<TenantConfig["businessSubtype"]>(undefined);
  /** Moneda: solo memoria local hasta Continuar (el modal no llama updateTenant). */
  const [monedaCode, setMonedaCode] = useState(config.locale.currency.code);
  const [modalMonedaVisible, setModalMonedaVisible] = useState(false);

  const monedaActual =
    MONEDAS_LATAM.find((m) => m.code === monedaCode) ?? MONEDAS_LATAM[0];

  useEffect(() => {
    setSelectedSubtype(undefined);
  }, [tipoSeleccionado]);

  const opcionesSubtype = SUBTYPES[tipoSeleccionado];
  const mostrarSubtypes = opcionesSubtype != null && opcionesSubtype.length > 1;

  const continuar = async () => {
    const tipo = TIPOS.find((t) => t.key === tipoSeleccionado);
    if (!tipo) return;
    await updateTenant({
      businessType: tipo.key,
      businessSubtype: selectedSubtype,
      theme: tipo.preset.theme,
      terminology: tipo.preset.terminology,
      businessHours: tipo.preset.businessHours,
      commissions: tipo.preset.commissions,
      locale: {
        ...config.locale,
        currency: { code: monedaActual.code, symbol: monedaActual.symbol },
      },
    });
    onNext();
  };

  const onSeleccionarMoneda = (moneda: Moneda) => {
    setMonedaCode(moneda.code);
  };

  return (
    <>
      <OnboardingLayout scrollable>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <ThemedText
            style={[styles.badge, { color: Onboarding.lunarisAccent }]}
          >
            PASO 1 DE 4
          </ThemedText>
          <OnboardingProgressDots currentStep={1} />
          <ThemedText style={[styles.titulo, { color: Onboarding.text }]}>
            ¿Qué tipo de negocio tienes?
          </ThemedText>
          <ThemedText
            style={[styles.subtitulo, { color: Onboarding.textMuted }]}
          >
            Personalizamos todo según tu tipo de salón
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsColumn}>
          {TIPOS.map((tipo, i) => {
            const seleccionado = tipoSeleccionado === tipo.key;
            const primary = tipo.preset.theme.primaryColor;
            return (
              <Animated.View
                key={tipo.key}
                entering={FadeInDown.delay(i * 80).duration(400)}
              >
                <Pressable
                  onPress={() => setTipoSeleccionado(tipo.key)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      borderColor: seleccionado ? primary : Onboarding.border,
                      backgroundColor: seleccionado
                        ? hexToRgba(primary, 0.1)
                        : Onboarding.cardBackground,
                    },
                    pressed && styles.cardPressed,
                  ]}
                >
                  {/* Ícono con fondo circular */}
                  <View
                    style={[
                      styles.iconBg,
                      {
                        backgroundColor: hexToRgba(primary, 0.15),
                      },
                    ]}
                  >
                    <Feather
                      name={tipo.icon}
                      size={28}
                      color={seleccionado ? primary : Onboarding.iconInactive}
                    />
                  </View>

                  <View style={styles.cardTexto}>
                    <ThemedText
                      style={[styles.cardNombre, { color: Onboarding.text }]}
                    >
                      {tipo.nombre}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.cardDesc,
                        { color: Onboarding.textSubtle },
                      ]}
                    >
                      {tipo.descripcion}
                    </ThemedText>
                  </View>

                  {/* Check absolute top-right */}
                  <View
                    style={[
                      styles.check,
                      seleccionado
                        ? { backgroundColor: primary, borderColor: primary }
                        : { borderColor: Onboarding.checkBorder },
                    ]}
                  >
                    {seleccionado ? (
                      <Feather
                        name="check"
                        size={12}
                        color={Colors.dark.white}
                      />
                    ) : null}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          {mostrarSubtypes && opcionesSubtype ? (
            <Animated.View
              key={`subtypes-${tipoSeleccionado}`}
              entering={FadeInDown.duration(250)}
              style={styles.subtypeBloque}
            >
              <ThemedText
                type="small"
                style={[
                  styles.subtypeLabel,
                  { color: Onboarding.textMuted, marginBottom: Spacing.sm + 2 },
                ]}
              >
                ¿Qué tipo de negocio?
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={styles.subtypeChipsContent}
              >
                {opcionesSubtype.map((opt) => {
                  const activo = selectedSubtype === opt.key;
                  return (
                    <Pressable
                      key={opt.label}
                      onPress={() => setSelectedSubtype(opt.key)}
                      style={({ pressed }) => [
                        pressed && styles.chipPressed,
                        styles.chipOuter,
                      ]}
                    >
                      {activo ? (
                        <LinearGradient
                          colors={[...Gradients.onboarding.colors]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.chipGradient}
                        >
                          <ThemedText
                            type="small"
                            style={styles.chipTextoActivo}
                            lightColor={Colors.dark.white}
                            darkColor={Colors.dark.white}
                          >
                            {opt.label}
                          </ThemedText>
                        </LinearGradient>
                      ) : (
                        <View
                          style={[
                            styles.chipInactivo,
                            { borderColor: Onboarding.chipBorder },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={[
                              styles.chipTextoInactivo,
                              { color: Onboarding.textMuted },
                            ]}
                          >
                            {opt.label}
                          </ThemedText>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          ) : null}

          <Animated.View
            entering={FadeInDown.delay(120).duration(400)}
            style={styles.monedaCampo}
          >
            <ThemedText
              type="small"
              style={[styles.monedaLabel, { color: Onboarding.textMuted }]}
            >
              Moneda
            </ThemedText>
            <Pressable
              onPress={() => setModalMonedaVisible(true)}
              style={({ pressed }) => [
                styles.monedaSelector,
                pressed && styles.monedaSelectorPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Elegir moneda"
            >
              <View style={styles.monedaSelectorIzq}>
                <ThemedText style={styles.monedaSelectorSymbol}>
                  {monedaActual.symbol}
                </ThemedText>
                <View style={styles.monedaSelectorTextos}>
                  <ThemedText style={styles.monedaSelectorTitulo}>
                    {monedaActual.nombre}
                  </ThemedText>
                  <ThemedText style={styles.monedaSelectorSub}>
                    {monedaActual.pais} · {monedaActual.code}
                  </ThemedText>
                </View>
              </View>
              <Feather
                name="chevron-down"
                size={20}
                color={Onboarding.textMuted}
              />
            </Pressable>
            <ThemedText style={styles.monedaHint}>
              Se guarda al pulsar Continuar
            </ThemedText>
          </Animated.View>
        </View>

        {/* Botón Continuar — mismo patrón que el resto del onboarding */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.footer}
        >
          <GradientCTAButton
            label="Continuar"
            icon="arrow-right"
            onPress={continuar}
          />
        </Animated.View>
      </OnboardingLayout>

      <CurrencyPickerModal
        visible={modalMonedaVisible}
        currentCode={monedaCode}
        onSelect={onSeleccionarMoneda}
        onClose={() => setModalMonedaVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing["2xl"],
  },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  subtitulo: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardsColumn: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  subtypeBloque: {
    marginTop: Spacing.md,
  },
  subtypeLabel: {
    fontSize: 13,
  },
  subtypeChipsContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Spacing.sm,
  },
  chipOuter: {
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipGradient: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
  },
  chipInactivo: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    backgroundColor: Onboarding.chipBackground,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTextoActivo: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextoInactivo: {
    fontSize: 13,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.card,
    borderWidth: 0.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardPressed: {
    opacity: 0.88,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTexto: {
    flex: 1,
  },
  cardNombre: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },
  footer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  monedaCampo: {
    marginTop: Spacing.sm,
  },
  monedaLabel: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  monedaSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Onboarding.chipBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Onboarding.chipBorder,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  monedaSelectorPressed: {
    opacity: 0.88,
  },
  monedaSelectorIzq: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  monedaSelectorTextos: {
    flex: 1,
    minWidth: 0,
  },
  monedaSelectorSymbol: {
    fontSize: 22,
    fontWeight: "700",
    color: Onboarding.text,
    minWidth: 36,
  },
  monedaSelectorTitulo: {
    fontSize: 15,
    fontWeight: "600",
    color: Onboarding.text,
  },
  monedaSelectorSub: {
    fontSize: 12,
    color: Onboarding.textSubtle,
    marginTop: 2,
  },
  monedaHint: {
    fontSize: 12,
    color: Onboarding.textMuted,
    marginTop: Spacing.sm,
  },
});
