import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface LoginScreenProps {
  /** Llamado tras login exitoso (ej. para avanzar en onboarding) */
  onSuccess?: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps = {}) {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await login(usuario.trim(), password);
      if (!result.ok) {
        setError(result.error ?? "Error al iniciar sesión");
      } else {
        onSuccess?.();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.form}
        >
          {/* Logo & Brand */}
          <Animated.View
            entering={FadeInUp.duration(600)}
            style={styles.brandSection}
          >
            <ThemedText style={styles.wordmark}>SalonPro</ThemedText>
            <ThemedText style={styles.brandSubtitle}>
              Panel de gestión
            </ThemedText>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            style={[styles.card, Shadows.md]}
          >
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Correo electrónico</ThemedText>
              <View style={[styles.inputWrapper]}>
                <Feather
                  name="user"
                  size={18}
                  color="rgba(255,255,255,0.35)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="tu-usuario@tusalon.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={usuario}
                  onChangeText={(text) => {
                    setUsuario(text);
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
              <View style={[styles.inputWrapper]}>
                <Feather
                  name="lock"
                  size={18}
                  color="rgba(255,255,255,0.35)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
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
                    size={20}
                    color="rgba(255,255,255,0.5)"
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={[
                  styles.errorBox,
                  { backgroundColor: Colors.dark.error + "15" },
                ]}
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

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: "#FFFFFF" },
                pressed && { opacity: 0.9 },
                loading && { opacity: 0.7 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  <ThemedText style={styles.submitButtonText}>
                    Entrar
                  </ThemedText>
                  <Feather name="arrow-right" size={18} color="#000000" />
                </>
              )}
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  form: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  brandSection: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  wordmark: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 0.5,
    padding: Spacing.xl,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
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
    color: "rgba(255,255,255,0.4)",
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
    paddingRight: 40,
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
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  submitButton: {
    height: Spacing.buttonHeight,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  submitButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "600",
  },
});
