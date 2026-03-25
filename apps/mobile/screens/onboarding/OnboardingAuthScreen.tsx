import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
  DiamondSparkle,
} from "@/screens/onboarding/components";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

type AuthFlow = "wizard" | "returning";

interface OnboardingAuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  flow?: AuthFlow;
}

export default function OnboardingAuthScreen({
  onSuccess,
  onBack,
  flow = "wizard",
}: OnboardingAuthScreenProps) {
  const esRegreso = flow === "returning";
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.ok) {
        setError(result.error ?? "No pudimos entrar, revisa tus datos.");
      } else {
        onSuccess();
      }
    } catch {
      setError("Error de conexión, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout scrollable>
      <View style={styles.inner}>
        {/* Logo o dots según flujo */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.logoRow}
        >
          {esRegreso ? (
            <View style={styles.dotsRow}>
              <OnboardingProgressDots currentStep={5} />
            </View>
          ) : (
            <View style={styles.logoWrap}>
              <DiamondSparkle size={52} />
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <ThemedText style={styles.titulo}>
            {esRegreso ? "Entra con tu cuenta" : "Crea tu cuenta"}
          </ThemedText>
          <ThemedText style={styles.subtitulo}>
            {esRegreso
              ? "Si ya configuraste tu negocio, entras y sigues donde lo dejaste."
              : "El último paso para activar tu negocio"}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.card}
        >
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
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
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
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword((p) => !p)}
                style={styles.eyeButton}
                hitSlop={12}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color="rgba(255,255,255,0.6)"
                />
              </Pressable>
            </View>
          </View>

          {error ? (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={styles.errorBox}
            >
              <Feather
                name="alert-circle"
                size={16}
                color={Colors.dark.error}
              />
              <ThemedText
                style={[styles.errorText, { color: Colors.dark.error }]}
              >
                {error}
              </ThemedText>
            </Animated.View>
          ) : null}

          <View style={styles.actionsRow}>
            <GradientCTAButton
              variant="outline"
              label="Atrás"
              onPress={onBack}
              disabled={loading}
              style={styles.btnHalf}
            />
            <GradientCTAButton
              label={esRegreso ? "Entrar" : "Crear cuenta y continuar"}
              icon="arrow-right"
              onPress={handleSubmit}
              loading={loading}
              style={styles.btnPrimary}
            />
          </View>
        </Animated.View>

        {/* Link "¿Ya tienes cuenta? Inicia sesión" */}
        {!esRegreso ? (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.loginLinkWrap}
          >
            <ThemedText style={styles.loginLinkText}>
              ¿Ya tienes cuenta?{" "}
              <ThemedText style={styles.loginLinkHighlight} onPress={onBack}>
                Inicia sesión
              </ThemedText>
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
    flexGrow: 1,
    paddingBottom: Spacing["2xl"],
  },
  logoRow: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  logoWrap: {
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  header: {
    marginBottom: Spacing["2xl"],
    alignItems: "center",
  },
  titulo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  subtitulo: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#FFFFFF",
  },
  passwordInput: {
    paddingRight: 36,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.dark.error + "15",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  actionsRow: {
    marginTop: Spacing["2xl"],
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.md,
  },
  btnHalf: {
    flex: 1,
  },
  btnPrimary: {
    flex: 1.4,
  },
  loginLinkWrap: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
  loginLinkHighlight: {
    color: "#E91E8C",
    fontWeight: "600",
  },
});
