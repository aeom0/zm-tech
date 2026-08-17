// ============================================================
// RepMAX Business Suite — Tipos de navegación tipados
// ============================================================
import type { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  OnboardingSplash: undefined;
  OnboardingCountry: undefined;
  OnboardingVehicle: undefined;
  OnboardingBusiness: undefined;
  OnboardingTheme: undefined;
  OnboardingPreview: undefined;
  OnboardingDecision: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

import type { ItemAlertaMlStock } from '../utils/mlStockAlert';

export type POSStackParamList = {
  POS: undefined;
  Cart: undefined;
  Payment: undefined;
  Receipt: { saleId: string; mlStockAlert?: ItemAlertaMlStock[] };
};

export type InventoryStackParamList = {
  Inventory: undefined;
  ProductForm: {
    productId?: string;
    pendingPhoto?: { slotIndex: number; uri: string };
  };
  PhotoCapture: { slotIndex: number; productId?: string };
  PhotoReview: {
    slotIndex: number;
    productId?: string;
    uri: string;
    width: number;
    height: number;
    fileSize?: number | null;
    mimeType?: string | null;
  };
};

export type CustomersStackParamList = {
  Customers: { openCreate?: boolean } | undefined;
  CustomerDetail: { customerId: string };
};

export type MoreStackParamList = {
  MoreHome: undefined;
  CashSession: undefined;
  StoreSettings: undefined;
  ExchangeRate: undefined;
};

/** @deprecated Usar MoreStackParamList — alias para pantallas de settings */
export type SettingsStackParamList = MoreStackParamList;

/** Tab bar: 5 destinos (Caja + Config viven en Más) */
export type MainTabParamList = {
  DashboardTab: undefined;
  POSTab: NavigatorScreenParams<POSStackParamList> | undefined;
  InventoryTab: NavigatorScreenParams<InventoryStackParamList> | undefined;
  CustomersTab: NavigatorScreenParams<CustomersStackParamList> | undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};
