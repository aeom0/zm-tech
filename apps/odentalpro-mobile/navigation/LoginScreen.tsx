import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useOdentalAuth, useTenant } from "@zmtech/tenant-config/odental";

/** Login OdentalPro — extraído tal cual del shell inicial de Fase 1, sin rediseño. */
export function LoginScreen() {
  const { isLoading, login } = useOdentalAuth();
  const { isLoading: tenantLoading } = useTenant();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading || tenantLoading) {
    return (
      <View style={styles.banner}>
        <ActivityIndicator color="#2dd4bf" />
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>Auth OdentalPro</Text>
      <TextInput
        style={styles.input}
        placeholder="correo"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="clave"
        placeholderTextColor="#64748b"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={styles.primaryBtn}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          const res = await login(email, password);
          if (!res.ok) setError(res.error ?? "Error al entrar");
          setBusy(false);
        }}
      >
        <Text style={styles.primaryText}>{busy ? "Entrando…" : "Entrar"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  bannerTitle: { color: "#f0f4f8", fontSize: 16, fontWeight: "600" },
  input: {
    backgroundColor: "#1a2332",
    color: "#f0f4f8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: "#0d9488",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600" },
  error: { color: "#f87171", fontSize: 12 },
});
