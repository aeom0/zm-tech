import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  OdentalAuthProvider,
  OdentalTenantProvider,
  useOdentalAuth,
  useTenant,
} from "@geemastudio/tenant-config/odental";

import { supabase } from "@/lib/supabase";
import { OdontogramView } from "@/screens/odontogram";

function AuthBanner() {
  const { isAuthenticated, isLoading, employee, role, login, logout } =
    useOdentalAuth();
  const { config, tenantId, isLoading: tenantLoading } = useTenant();
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

  if (isAuthenticated) {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>{config.clinicName}</Text>
        <Text style={styles.bannerMeta}>
          {employee?.full_name} · {role} · tenant {tenantId?.slice(0, 8)}…
        </Text>
        <Pressable onPress={() => void logout()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Cerrar sesión</Text>
        </Pressable>
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
        <Text style={styles.primaryText}>
          {busy ? "Entrando…" : "Entrar"}
        </Text>
      </Pressable>
    </View>
  );
}

function AppShell() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <AuthBanner />
      <OdontogramView editable title="Odontograma (preview)" />
    </SafeAreaView>
  );
}

/**
 * Shell Fase 1+2: Auth/Tenant + odontograma render-first (sin persistencia).
 */
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <OdentalAuthProvider client={supabase}>
          <OdentalTenantProvider>
            <AppShell />
          </OdentalTenantProvider>
        </OdentalAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#0a0f14" },
  banner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  bannerTitle: { color: "#f0f4f8", fontSize: 16, fontWeight: "600" },
  bannerMeta: { color: "#94a3b8", fontSize: 12 },
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
  linkBtn: { alignSelf: "flex-start" },
  linkText: { color: "#2dd4bf", fontSize: 13 },
  error: { color: "#f87171", fontSize: 12 },
});
