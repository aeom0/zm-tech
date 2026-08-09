// ============================================================
// RepMAX Business Suite — Tipos de navegación tipados
// ============================================================

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

export type POSStackParamList = {
  POS: undefined;
  Cart: undefined;
  Payment: undefined;
  Receipt: { saleId: string };
};

export type InventoryStackParamList = {
  Inventory: undefined;
  ProductForm: { productId?: string };
};

export type CustomersStackParamList = {
  Customers: undefined;
  CustomerDetail: { customerId: string };
};

export type MainTabParamList = {
  DashboardTab: undefined;
  POSTab: undefined;
  InventoryTab: undefined;
  CustomersTab: undefined;
  ReportsTab: undefined;
  SettingsTab: undefined;
};

export type SettingsStackParamList = {
  StoreSettings: undefined;
  ExchangeRate:  undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};
