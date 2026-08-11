// ============================================================
// Tab bar adaptativo: bottom (phone) | sidebar (tablet landscape)
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '../../hooks/useResponsive';
import { colors, typography, spacing, layout } from '../../utils/theme';
import { hapticLight } from '../../utils/haptics';
import type { MainTabParamList } from '../../navigation/types';

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  DashboardTab: 'grid-outline',
  POSTab: 'cart-outline',
  InventoryTab: 'cube-outline',
  CustomersTab: 'people-outline',
  MoreTab: 'menu-outline',
};

function SideNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { height } = useResponsive();

  return (
    <View style={styles.tabBarSlot}>
      <View
        style={[
          styles.sidebar,
          {
            height,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <Text style={styles.brand}>RM</Text>
        <View style={styles.navItems}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            const onPress = () => {
              void hapticLight();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const color = focused ? colors.brand.orange : colors.text.secondary;
            const iconName = TAB_ICONS[route.name as keyof MainTabParamList] ?? 'ellipse-outline';

            return (
              <TouchableOpacity
                key={route.key}
                style={[styles.navItem, focused && styles.navItemActive]}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={label}
              >
                <Ionicons name={iconName} size={22} color={color} />
                <Text style={[styles.navLabel, { color }]} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Bottom tabs en phone/portrait · rail lateral en tablet landscape */
export function AdaptiveTabBar(props: BottomTabBarProps) {
  const { isTabletUp, isLandscape } = useResponsive();

  if (isTabletUp && isLandscape) {
    return <SideNavBar {...props} />;
  }

  return <BottomTabBar {...props} />;
}

const styles = StyleSheet.create({
  /** Slot inferior colapsado: el rail se dibuja absolute hacia arriba */
  tabBarSlot: {
    height: 0,
    width: '100%',
    overflow: 'visible',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: layout.sidebarWidth,
    backgroundColor: colors.bg.secondary,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.bg.border,
    alignItems: 'center',
  },
  brand: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.brand.orange,
    marginBottom: spacing.lg,
    letterSpacing: 1,
  },
  navItems: {
    flex: 1,
    width: '100%',
    gap: spacing.xs,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: 10,
    gap: 2,
  },
  navItemActive: {
    backgroundColor: colors.brand.orange + '18',
  },
  navLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    textAlign: 'center',
  },
});
