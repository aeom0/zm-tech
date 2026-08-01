// ============================================================
// RepMAX Business Suite — Navegador principal (tabs + stacks)
// ============================================================
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography } from '../utils/theme';

// Pantallas
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import POSScreen from '../screens/pos/POSScreen';
import CartScreen from '../screens/pos/CartScreen';
import PaymentScreen from '../screens/pos/PaymentScreen';
import ReceiptScreen from '../screens/pos/ReceiptScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import ProductFormScreen from '../screens/inventory/ProductFormScreen';
import CustomersScreen from '../screens/customers/CustomersScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import CashSessionScreen from '../screens/reports/CashSessionScreen';
import StoreSettingsScreen from '../screens/settings/StoreSettingsScreen';
import ExchangeRateScreen from '../screens/settings/ExchangeRateScreen';

import type {
  MainTabParamList,
  POSStackParamList,
  InventoryStackParamList,
  CustomersStackParamList,
  SettingsStackParamList,
} from './types';

// ── Stacks internos ─────────────────────────────────────────

const POSStack = createNativeStackNavigator<POSStackParamList>();
function POSNavigator() {
  return (
    <POSStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.secondary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md },
      }}
    >
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
    <InventoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.secondary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md },
      }}
    >
      <InventoryStack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventario' }} />
      <InventoryStack.Screen name="ProductForm" component={ProductFormScreen} options={({ route }) => ({
        title: route.params?.productId ? 'Editar Producto' : 'Nuevo Producto',
      })} />
    </InventoryStack.Navigator>
  );
}

const CustomersStack = createNativeStackNavigator<CustomersStackParamList>();
function CustomersNavigator() {
  return (
    <CustomersStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.secondary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md },
      }}
    >
      <CustomersStack.Screen name="Customers" component={CustomersScreen} options={{ title: 'Clientes' }} />
      <CustomersStack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Detalle de Cliente' }} />
    </CustomersStack.Navigator>
  );
}

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
function SettingsNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.secondary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md },
      }}
    >
      <SettingsStack.Screen
        name="StoreSettings"
        component={StoreSettingsScreen}
        options={{ title: 'Mi Tienda' }}
      />
      <SettingsStack.Screen
        name="ExchangeRate"
        component={ExchangeRateScreen}
        options={{ title: 'Tasa de Cambio' }}
      />
    </SettingsStack.Navigator>
  );
}

// ── Tab principal ────────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.bg.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: colors.brand.orange,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.size.xs,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            DashboardTab: 'grid-outline',
            POSTab: 'cart-outline',
            InventoryTab: 'cube-outline',
            CustomersTab: 'people-outline',
            ReportsTab: 'bar-chart-outline',
            SettingsTab: 'settings-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="POSTab" component={POSNavigator} options={{ title: 'Ventas' }} />
      <Tab.Screen name="InventoryTab" component={InventoryNavigator} options={{ title: 'Inventario' }} />
      <Tab.Screen name="CustomersTab" component={CustomersNavigator} options={{ title: 'Clientes' }} />
      <Tab.Screen name="ReportsTab" component={CashSessionScreen} options={{ title: 'Caja' }} />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{ title: 'Config.' }}
      />
    </Tab.Navigator>
  );
}
