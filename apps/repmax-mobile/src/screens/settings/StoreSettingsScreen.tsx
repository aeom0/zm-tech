// ============================================================
// RepMAX Business Suite — Configuración de la Tienda
// Editar nombre, teléfono, ciudad y dirección.
// Solo el owner puede editar. La tasa USD/BS tiene su propia pantalla.
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useMercadoLibreConnection } from '../../hooks/useMercadoLibreConnection';
import { ML_API_ENABLED, ML_MANUAL_MODE_HINT, ML_SUPPORT_TICKET } from '../../constants/mlConfig';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'StoreSettings'>;

// ── Subcomponente: campo de formulario ───────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  editable: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', editable, icon, multiline }: FieldProps) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputRow, !editable && fieldStyles.inputRowDisabled, multiline && fieldStyles.inputRowMultiline]}>
        <Ionicons name={icon} size={18} color={editable ? colors.brand.steel : colors.text.disabled} style={multiline && fieldStyles.iconTop} />
        <TextInput
          style={[fieldStyles.input, !editable && fieldStyles.inputDisabled, multiline && fieldStyles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  inputRowDisabled: {
    opacity: 0.45,
  },
  inputRowMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  iconTop: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
  },
  inputDisabled: {
    color: colors.text.disabled,
  },
  inputMultiline: {
    minHeight: 64,
  },
});

// ── Subcomponente: ítem de menú (fila navegable) ─────────────
interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, subtitle, value, onPress, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={menuStyles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={menuStyles.left}>
        <View style={[menuStyles.iconBox, danger && menuStyles.iconBoxDanger]}>
          <Ionicons
            name={icon}
            size={18}
            color={danger ? colors.semantic.error : colors.brand.orange}
          />
        </View>
        <View>
          <Text style={[menuStyles.label, danger && menuStyles.labelDanger]}>{label}</Text>
          {subtitle ? <Text style={menuStyles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={menuStyles.right}>
        {value ? <Text style={menuStyles.value}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
      </View>
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.brand.orange + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: {
    backgroundColor: colors.semantic.error + '18',
  },
  label: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.primary,
  },
  labelDanger: {
    color: colors.semantic.error,
  },
  subtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
});

// ── Config de badges por plan ─────────────────────────────────
const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
  basic:      { label: 'Básico',     color: colors.text.secondary },
  pro:        { label: 'Pro ✦',      color: colors.brand.orange },
  enterprise: { label: 'Enterprise', color: colors.semantic.info },
};

// ── Pantalla principal ────────────────────────────────────────
export default function StoreSettingsScreen({ navigation }: Props) {
  const { user, storeUser, store, updateStore, logout } = useAuth();

  const [name, setName]       = useState(store?.name ?? '');
  const [phone, setPhone]     = useState(store?.phone ?? '');
  const [city, setCity]       = useState(store?.city ?? '');
  const [address, setAddress] = useState(store?.address ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = storeUser?.role === 'owner';
  const plan    = store?.plan ?? 'basic';
  const planCfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.basic;
  const ml = useMercadoLibreConnection();

  // Formatea la fecha de actualización de la tasa
  const rateUpdated = store?.updatedAt
    ? new Date(store.updatedAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'hoy';

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la tienda es requerido.');
      return;
    }
    setIsSaving(true);
    try {
      await updateStore({ name: name.trim(), phone, city, address });
      Alert.alert('✓ Guardado', 'Datos de la tienda actualizados.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera de cuenta */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {store?.name?.[0]?.toUpperCase() ?? 'T'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.storeName}>{store?.name ?? '—'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{storeUser?.role ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Banner de advertencia para no-owner */}
        {!isOwner && (
          <View style={styles.warnBanner}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.semantic.warning} />
            <Text style={styles.warnText}>
              Solo el dueño de la tienda puede editar esta información.
            </Text>
          </View>
        )}

        {/* Sección: información de la tienda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la Tienda</Text>
          <View style={styles.card}>
            <Field
              label="Nombre de la tienda"
              value={name}
              onChangeText={setName}
              placeholder="Mis Autopartes"
              icon="storefront-outline"
              editable={isOwner}
            />
            <Field
              label="Teléfono"
              value={phone}
              onChangeText={setPhone}
              placeholder="+58 412 000 0000"
              keyboardType="phone-pad"
              icon="call-outline"
              editable={isOwner}
            />
            <Field
              label="Ciudad"
              value={city}
              onChangeText={setCity}
              placeholder="Caracas"
              icon="map-outline"
              editable={isOwner}
            />
            <Field
              label="Dirección"
              value={address}
              onChangeText={setAddress}
              placeholder="Av. Principal, Local 1"
              icon="location-outline"
              editable={isOwner}
              multiline
            />

            {isOwner && (
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
                    <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sección: tasa de cambio — navega a ExchangeRateScreen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasa de Cambio USD / Bs</Text>
          <View style={[styles.card, styles.cardNoInnerPad]}>
            <MenuItem
              icon="swap-horizontal-outline"
              label="Tasa de cambio"
              subtitle={`Actualizada: ${rateUpdated}`}
              value={`1 USD = ${store?.usdBsRate?.toFixed(2) ?? '—'} Bs`}
              onPress={() => navigation.navigate('ExchangeRate')}
            />
          </View>
        </View>

        {/* Sección: MercadoLibre */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MercadoLibre</Text>
          <View style={styles.card}>
            {ML_API_ENABLED ? (
              <>
                <Text style={styles.mlStatusLabel}>
                  {ml.isLoading
                    ? 'Cargando…'
                    : ml.status === 'connected'
                      ? 'Cuenta conectada'
                      : ml.status === 'connecting'
                        ? 'Conectando…'
                        : ml.status === 'expired'
                          ? 'Sesión vencida'
                          : 'Sin conectar'}
                </Text>
                <Text style={styles.planHint}>
                  {!ml.planPermiteMl
                    ? 'Actualiza a Pro para conectar MercadoLibre'
                    : !isOwner
                      ? 'Solo el dueño puede conectar o desconectar la cuenta'
                      : ml.status === 'connected'
                        ? 'Las publicaciones salen con esta cuenta'
                        : 'Se conecta una sola vez para toda la tienda'}
                </Text>
                {ml.error ? <Text style={styles.mlError}>{ml.error}</Text> : null}
                {isOwner && ml.planPermiteMl ? (
                  <TouchableOpacity
                    style={[
                      styles.mlBtn,
                      ml.status === 'connected' && styles.mlBtnDanger,
                      ml.status === 'connecting' && styles.saveBtnDisabled,
                    ]}
                    onPress={() => {
                      if (ml.status === 'connecting') return;
                      if (ml.status === 'connected') {
                        Alert.alert(
                          'Desconectar MercadoLibre',
                          'Se corta la sesión. Las fichas en RepMAX se quedan; no se publican más hasta reconectar.',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Desconectar', style: 'destructive', onPress: () => { void ml.disconnect(); } },
                          ],
                        );
                        return;
                      }
                      void ml.connect();
                    }}
                    disabled={ml.status === 'connecting'}
                    activeOpacity={0.8}
                  >
                    {ml.status === 'connecting' ? (
                      <ActivityIndicator color={colors.text.inverse} />
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {ml.status === 'connected'
                          ? 'Desconectar'
                          : ml.status === 'expired'
                            ? 'Reconectar'
                            : 'Conectar MercadoLibre'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.mlStatusLabel}>Modo catálogo ML-ready</Text>
                <Text style={styles.planHint}>{ML_MANUAL_MODE_HINT}</Text>
                <Text style={styles.planHint}>
                  Soporte ML consulta #{ML_SUPPORT_TICKET} — esperando respuesta para activar OAuth en Venezuela.
                </Text>
                <Text style={styles.planHint}>
                  Marca productos en inventario, completa el checklist y exporta desde el ícono de descarga (CSV para el publicador masivo de ML).
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Sección: plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan</Text>
          <View style={[styles.card, styles.cardNoInnerPad]}>
            <View style={styles.planRow}>
              <View style={styles.planLeft}>
                <View style={[menuStyles.iconBox, { backgroundColor: planCfg.color + '18' }]}>
                  <Ionicons name="ribbon-outline" size={18} color={planCfg.color} />
                </View>
                <View>
                  <Text style={[styles.planLabel, { color: planCfg.color }]}>{planCfg.label}</Text>
                  {plan === 'basic' && (
                    <Text style={styles.planHint}>Actualiza a Pro para conectar MercadoLibre</Text>
                  )}
                </View>
              </View>
            </View>
            <View style={[styles.planRow, styles.planRowBorder]}>
              <View style={menuStyles.left}>
                <View style={menuStyles.iconBox}>
                  <Ionicons name="link-outline" size={18} color={colors.brand.orange} />
                </View>
                <Text style={menuStyles.label}>Slug</Text>
              </View>
              <Text style={menuStyles.value}>{store?.slug ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Sección: sesión */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sesión</Text>
          <View style={[styles.card, styles.cardNoInnerPad]}>
            <MenuItem
              icon="log-out-outline"
              label="Cerrar Sesión"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <Text style={styles.version}>RepMAX Business Suite v1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'] * 2,
  },

  // Perfil
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: colors.brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.brand.orange + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.brand.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Banner advertencia
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.warning + '18',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.semantic.warning + '40',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  warnText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.semantic.warning,
  },

  // Secciones
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  cardNoInnerPad: {
    padding: 0,
  },

  // Plan
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  planRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planLabel: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
  },
  planHint: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Botón guardar
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  mlStatusLabel: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  mlError: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.semantic.error,
    marginTop: spacing.sm,
  },
  mlBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  mlBtnDanger: {
    backgroundColor: colors.semantic.error,
  },
  saveBtnText: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },

  // Pie
  version: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
