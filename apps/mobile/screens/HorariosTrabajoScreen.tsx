import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTenant } from "@/contexts/TenantContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { MoreStackParamList } from "@/navigation/MoreStackNavigator";
import type { TenantConfig } from "@salonpro/tenant-config";
import {
  CLAVES_DIA_LABORAL,
  ETIQUETA_DIA_LABORAL,
  ZONAS_HORARIAS_SUGERIDAS,
  normalizarHorarioSemanal,
  validarHorarioCompleto,
} from "@salonpro/tenant-config";

type Nav = NativeStackNavigationProp<MoreStackParamList, "HorariosTrabajo">;

export default function HorariosTrabajoScreen() {
  const navigation = useNavigation<Nav>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config, updateTenant } = useTenant();

  const [draftTimezone, setDraftTimezone] = useState(config.locale.timezone);
  const [draftHours, setDraftHours] = useState<TenantConfig["businessHours"]>(
    () => normalizarHorarioSemanal(config.businessHours),
  );
  const [guardando, setGuardando] = useState(false);
  const [zonasExpandidas, setZonasExpandidas] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setDraftTimezone(config.locale.timezone);
      setDraftHours(normalizarHorarioSemanal(config.businessHours));
    }, [config.locale.timezone, config.businessHours]),
  );

  const guardar = useCallback(async () => {
    const err = validarHorarioCompleto(draftHours);
    if (err) {
      Alert.alert("Revisa los datos", err);
      return;
    }
    setGuardando(true);
    try {
      await updateTenant(
        {
          locale: { ...config.locale, timezone: draftTimezone },
          businessHours: draftHours,
        },
        { syncRemote: true },
      );
      Alert.alert("Listo", "Horario y zona horaria guardados.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al guardar.";
      Alert.alert("No se pudo guardar", msg);
    } finally {
      setGuardando(false);
    }
  }, [config.locale, draftHours, draftTimezone, updateTenant]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginRight: Spacing.sm }}>
          {guardando ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <ThemedText
              style={{ color: theme.primary, fontSize: 16, fontWeight: "600" }}
              onPress={() => void guardar()}
            >
              Guardar
            </ThemedText>
          )}
        </View>
      ),
    });
  }, [navigation, guardando, guardar, theme.primary]);

  const setDiaAbierto = (dia: (typeof CLAVES_DIA_LABORAL)[number], abierto: boolean) => {
    setDraftHours((prev) => {
      const next = { ...prev };
      if (!abierto) {
        next[dia] = null;
      } else {
        next[dia] = prev[dia] ?? { open: "10:00", close: "19:00" };
      }
      return next;
    });
  };

  const setHorasDia = (
    dia: (typeof CLAVES_DIA_LABORAL)[number],
    campo: "open" | "close",
    texto: string,
  ) => {
    setDraftHours((prev) => {
      const slot = prev[dia];
      const base = slot ?? { open: "10:00", close: "19:00" };
      return {
        ...prev,
        [dia]: { ...base, [campo]: texto },
      };
    });
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.lg }}>
        Esto define la franja usual del negocio y la zona horaria para fechas y
        reportes en la app. Ajustalo cuando cambien tus horarios.
      </ThemedText>

      <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
        Zona horaria
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: theme.textMuted, marginBottom: Spacing.sm }}
      >
        Actual: {draftTimezone}
      </ThemedText>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        {ZONAS_HORARIAS_SUGERIDAS.slice(
          0,
          zonasExpandidas ? undefined : 4,
        ).map((z) => {
          const selected = z.value === draftTimezone;
          return (
            <ThemedText
              key={z.value}
              style={[
                styles.zonaRow,
                selected && { color: theme.primary, fontWeight: "600" },
              ]}
              onPress={() => setDraftTimezone(z.value)}
            >
              {z.label}
            </ThemedText>
          );
        })}
      </View>
      <ThemedText
        type="small"
        style={{
          color: theme.primary,
          marginTop: Spacing.sm,
          marginBottom: Spacing.xl,
        }}
        onPress={() => setZonasExpandidas((v) => !v)}
      >
        {zonasExpandidas ? "Ver menos" : "Ver más zonas"}
      </ThemedText>

      <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
        Por día
      </ThemedText>

      {CLAVES_DIA_LABORAL.map((dia) => {
        const slot = draftHours[dia];
        const abierto = slot !== null && slot !== undefined;

        return (
          <View
            key={dia}
            style={[
              styles.diaCard,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <View style={styles.diaHeader}>
              <ThemedText style={{ fontWeight: "600" }}>
                {ETIQUETA_DIA_LABORAL[dia]}
              </ThemedText>
              <View style={styles.switchRow}>
                <ThemedText type="small" style={{ color: theme.textMuted, marginRight: Spacing.sm }}>
                  Abierto
                </ThemedText>
                <Switch
                  value={abierto}
                  onValueChange={(v) => setDiaAbierto(dia, v)}
                  trackColor={{ false: theme.border, true: `${theme.primary}88` }}
                  thumbColor={abierto ? theme.primary : theme.textMuted}
                />
              </View>
            </View>
            {abierto && slot ? (
              <View style={styles.horasRow}>
                <View style={styles.horaInputWrap}>
                  <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: 4 }}>
                    Apertura
                  </ThemedText>
                  <TextInput
                    value={slot.open}
                    onChangeText={(t) => setHorasDia(dia, "open", t)}
                    placeholder="09:00"
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.backgroundRoot,
                      },
                    ]}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
                <View style={styles.horaInputWrap}>
                  <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: 4 }}>
                    Cierre
                  </ThemedText>
                  <TextInput
                    value={slot.close}
                    onChangeText={(t) => setHorasDia(dia, "close", t)}
                    placeholder="18:00"
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.backgroundRoot,
                      },
                    ]}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  zonaRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
    fontSize: 15,
  },
  diaCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  diaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchRow: { flexDirection: "row", alignItems: "center" },
  horasRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  horaInputWrap: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
});
