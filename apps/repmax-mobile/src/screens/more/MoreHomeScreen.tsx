// ============================================================
// RepMAX — Hub "Más": Caja + Configuración
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import type { MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, iconColor, title, subtitle, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.disabled} />
    </TouchableOpacity>
  );
}

export default function MoreHomeScreen({ navigation }: Props) {
  const { store, storeUser } = useAuth();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.storeCard}>
        <Text style={styles.storeName}>{store?.name ?? 'Mi tienda'}</Text>
        <Text style={styles.storeMeta}>
          {storeUser?.role === 'owner' ? 'Propietario' : storeUser?.role ?? 'Usuario'}
        </Text>
      </View>

      <Text style={styles.section}>Operación</Text>
      <View style={styles.group}>
        <MenuItem
          icon="wallet-outline"
          iconColor={colors.semantic.warning}
          title="Caja"
          subtitle="Abrir, cerrar y ver ventas de la sesión"
          onPress={() => navigation.navigate('CashSession')}
        />
      </View>

      <Text style={styles.section}>Configuración</Text>
      <View style={styles.group}>
        <MenuItem
          icon="storefront-outline"
          iconColor={colors.brand.orange}
          title="Mi tienda"
          subtitle="Nombre, contacto y datos del negocio"
          onPress={() => navigation.navigate('StoreSettings')}
        />
        <View style={styles.divider} />
        <MenuItem
          icon="trending-up-outline"
          iconColor={colors.semantic.info}
          title="Tasa de cambio"
          subtitle={store ? `1 USD = Bs. ${store.usdBsRate}` : 'USD / Bs.'}
          onPress={() => navigation.navigate('ExchangeRate')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  storeCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  storeName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text.primary,
  },
  storeMeta: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.brand.orange,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  section: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  group: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  itemSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.bg.border,
    marginLeft: 68,
  },
});
