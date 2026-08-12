// ============================================================
// RepMAX Business Suite — Navegador principal (tabs + stacks)
// ============================================================
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography, layout } from '../utils/theme';
import { useResponsive } from '../hooks/useResponsive';
import { AdaptiveTabBar } from '../components/navigation/AdaptiveTabBar';

// Pantallas
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import POSScreen from '../screens/pos/POSScreen';
import CartScreen from '../screens/pos/CartScreen';
import PaymentScreen from '../screens/pos/PaymentScreen';
import ReceiptScreen from '../screens/pos/ReceiptScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import ProductFormScreen from '../screens/inventory/ProductFormScreen';
import PhotoCaptureScreen from '../screens/inventory/PhotoCaptureScreen';
import PhotoReviewScreen from '../screens/inventory/PhotoReviewScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import MoreHomeScreen from '../screens/more/MoreHomeScreen';
import CashSessionScreen from '../screens/reports/CashSessionScreen';
import StoreSettingsScreen from '../screens/settings/StoreSettingsScreen';
import ExchangeRateScreen from '../screens/settings/ExchangeRateScreen';

import type {
  MainTabParamList,
  POSStackParamList,
  InventoryStackParamList,
  CustomersStackParamList,
  MoreStackParamList,
} from './types';

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.bg.secondary },
  headerTintColor: colors.text.primary,
  headerTitleStyle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
  },
  headerShadowVisible: false,
};

// ── Stacks internos ─────────────────────────────────────────

const POSStack = createNativeStackNavigator<POSStackParamList>();
function POSNavigator() {
  return (
    <POSStack.Navigator screenOptions={stackScreenOptions}>
      <POSStack.Screen name="POS" component={POSScreen} options={{ title: 'Punto de Venta' }} />
      <POSStack.Screen name="Cart" component={CartScreen} options={{ title: 'Carrito' }} />
      <POSStack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Cobrar' }} />
      <POSStack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Comprobante', headerBackVisible: false }} />
    </POSStack.Navigator>
  );
}

const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();
function InventoryNavigator() {
  return (
    <InventoryStack.Navigator screenOptions={stackScreenOptions}>
      <InventoryStack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventario' }} />
      <InventoryStack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={({ route }) => ({
          title: route.params?.productId ? 'Editar Producto' : 'Nuevo Producto',
        })}
      />
      <InventoryStack.Screen
        name="PhotoCapture"
        component={PhotoCaptureScreen}
        options={{ headerShown: false }}
      />
      <InventoryStack.Screen
        name="PhotoReview"
        component={PhotoReviewScreen}
        options={{ headerShown: false }}
      />
    </InventoryStack.Navigator>
  );
}

const CustomersStack = createNativeStackNavigator<CustomersStackParamList>();
function CustomersNavigator() {
  return (
    <CustomersStack.Navigator screenOptions={stackScreenOptions}>
      <CustomersStack.Screen name="Customers" component={CustomersScreen} options={{ title: 'Clientes' }} />
      <CustomersStack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Detalle de Cliente' }} />
    </CustomersStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator<MoreStackParamList>();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={stackScreenOptions}>
      <MoreStack.Screen name="MoreHome" component={MoreHomeScreen} options={{ title: 'Más' }} />
      <MoreStack.Screen name="CashSession" component={CashSessionScreen} options={{ title: 'Caja' }} />
      <MoreStack.Screen name="StoreSettings" component={StoreSettingsScreen} options={{ title: 'Mi Tienda' }} />
      <MoreStack.Screen name="ExchangeRate" component={ExchangeRateScreen} options={{ title: 'Tasa de Cambio' }} />
    </MoreStack.Navigator>
  );
}

// ── Tab principal (5 destinos) ───────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const insets = useSafeAreaInsets();
  const { isTabletUp, isLandscape } = useResponsive();
  const useSidebar = isTabletUp && isLandscape;
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      tabBar={(props) => <AdaptiveTabBar {...props} />}
      safeAreaInsets={useSidebar ? { top: 0, right: 0, bottom: 0, left: 0 } : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        // Empuja el contenido a la derecha del rail en landscape tablet
        sceneStyle: useSidebar ? { marginLeft: layout.sidebarWidth } : undefined,
        tabBarStyle: useSidebar
          ? {
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              height: 0,
            }
          : {
              backgroundColor: colors.bg.secondary,
              borderTopColor: colors.bg.border,
              borderTopWidth: 1,
              height: layout.tabBarContentHeight + bottomInset,
              paddingTop: 6,
              paddingBottom: bottomInset,
            },
        tabBarActiveTintColor: colors.brand.orange,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: 11,
          marginBottom: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            DashboardTab: 'grid-outline',
            POSTab: 'cart-outline',
            InventoryTab: 'cube-outline',
            CustomersTab: 'people-outline',
            MoreTab: 'menu-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="POSTab" component={POSNavigator} options={{ title: 'Ventas' }} />
      <Tab.Screen name="InventoryTab" component={InventoryNavigator} options={{ title: 'Stock' }} />
      <Tab.Screen name="CustomersTab" component={CustomersNavigator} options={{ title: 'Clientes' }} />
      <Tab.Screen name="MoreTab" component={MoreNavigator} options={{ title: 'Más' }} />
    </Tab.Navigator>
  );
}
