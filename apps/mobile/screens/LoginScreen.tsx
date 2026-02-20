import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

export function LoginScreen() {
  const { theme } = useTheme();
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
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
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
            <View
              style={[styles.logoWrapper, { backgroundColor: theme.primary }]}
            >
              <Image
                source={require("@/assets/images/logo/logo-positivo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.divider}>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
              <View
                style={[
                  styles.dividerDot,
                  { backgroundColor: Colors.light.gold },
                ]}
              />
              <View
                style={[styles.dividerLine, { backgroundColor: theme.border }]}
              />
            </View>
            <ThemedText
              style={[styles.welcomeText, { color: theme.textSecondary }]}
            >
              Panel de Gestión
            </ThemedText>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            style={[
              styles.card,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...Shadows.md,
              },
            ]}
          >
            <View style={styles.inputGroup}>
              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                Correo electrónico
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Feather
                  name="user"
                  size={18}
                  color={theme.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="tu-usuario@zmlashnails.com"
                  placeholderTextColor={theme.textMuted}
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
              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                Contraseña
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={18}
                  color={theme.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { color: theme.text },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
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
                    color={theme.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={[
                  styles.errorBox,
                  { backgroundColor: theme.error + "15" },
                ]}
              >
                <Feather name="alert-circle" size={16} color={theme.error} />
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </ThemedText>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.9 },
                loading && { opacity: 0.7 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <ThemedText style={styles.submitButtonText}>
                    Entrar
                  </ThemedText>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 100,
    height: 60,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dividerLine: {
    width: 24,
    height: 1,
  },
  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  welcomeText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
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
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  submitButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
