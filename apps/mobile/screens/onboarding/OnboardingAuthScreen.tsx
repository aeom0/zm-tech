import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GradientButton } from "@/components/GradientButton";
import { GradientProgressDots } from "@/components/GradientProgressDots";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

type AuthFlow = "wizard" | "returning";

interface OnboardingAuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  /** "wizard" = paso 5 del onboarding; "returning" = ya tengo cuenta (misma UI que el resto del wizard) */
  flow?: AuthFlow;
}

/**
 * Paso de autenticación dentro del onboarding.
 * Mismo look&feel que las demás pantallas de onboarding,
 * pero reutiliza la lógica de login del AuthContext (modo dev).
 */
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
    <View style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.inner}
        >
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.header}
          >
            {!esRegreso ? (
              <View style={styles.dotsRow}>
                <GradientProgressDots total={5} current={4} />
              </View>
            ) : null}
            <ThemedText style={styles.titulo}>
              {esRegreso ? "Entra con tu cuenta" : "Crea tu acceso a SalonPro"}
            </ThemedText>
            <ThemedText style={styles.subtitulo}>
              {esRegreso
                ? "Si ya configuraste tu negocio, entras y sigues donde lo dejaste."
                : "Usaremos estos datos para que solo tú y tu equipo puedan entrar a la app."}
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
                  placeholder="tu-correo@tusalon.com"
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
              <Pressable
                onPress={onBack}
                disabled={loading}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  Atrás
                </ThemedText>
              </Pressable>
              <GradientButton
                label={esRegreso ? "Entrar" : "Crear cuenta y seguir"}
                onPress={handleSubmit}
                loading={loading}
                style={styles.primaryButtonWrapper}
              />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111318",
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  inner: {
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitulo: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
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
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 46,
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
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  primaryButtonWrapper: {
    flex: 1.4,
  },
});
