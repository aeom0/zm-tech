import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { AuthUser, Store, StoreUser, StoreType, VehicleFocus, ThemeKey, CountryCode } from '../types/database';

interface AuthState {
  user: AuthUser | null;
  storeUser: StoreUser | null;
  store: Store | null;
  isLoading: boolean;
}

// Datos que trae el onboarding mobile al momento de crear la cuenta real.
// Ver context/OnboardingContext.tsx y screens/onboarding/*.
interface RegisterInput {
  email: string;
  password: string;
  storeName: string;
  storeSlug: string;
  storeType: StoreType;
  vehicleFocus: VehicleFocus;
  theme: ThemeKey;
  country: CountryCode;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateStore: (data: Partial<Store>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Mapea snake_case de Supabase a camelCase de nuestros tipos
function mapStore(row: any): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    phone: row.phone,
    address: row.address,
    city: row.city,
    customDomain: row.custom_domain,
    plan: row.plan,
    isActive: row.is_active,
    currencyUsd: row.currency_usd,
    currencyBs: row.currency_bs,
    usdBsRate: parseFloat(row.usd_bs_rate),
    storeType: row.store_type,
    vehicleFocus: row.vehicle_focus,
    themeKey: row.theme_key,
    countryCode: row.country_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStoreUser(row: any): StoreUser {
  return {
    id: row.id,
    storeId: row.store_id,
    userId: row.user_id,
    role: row.role,
    fullName: row.full_name,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

// Carga store_user y store del usuario autenticado
async function loadStoreData(userId: string): Promise<{ storeUser: StoreUser | null; store: Store | null }> {
  const { data } = await supabase
    .from('repmax_store_users')
    .select('*, store:repmax_stores(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!data) return { storeUser: null, store: null };

  const { store: storeRaw, ...storeUserRaw } = data as any;
  return {
    storeUser: mapStoreUser(storeUserRaw),
    store: storeRaw ? mapStore(storeRaw) : null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, storeUser: null, store: null, isLoading: true,
  });

  useEffect(() => {
    // Verificar sesión activa al iniciar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }
      const { storeUser, store } = await loadStoreData(session.user.id);
      setState({
        user: { id: session.user.id, email: session.user.email! },
        storeUser,
        store,
        isLoading: false,
      });
    });

    // Escuchar cambios de sesión (refresh de token, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setState({ user: null, storeUser: null, store: null, isLoading: false });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { storeUser, store } = await loadStoreData(session.user.id);
        setState({
          user: { id: session.user.id, email: session.user.email! },
          storeUser,
          store,
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // onAuthStateChange actualiza el estado
  };

  const register = async (input: RegisterInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('No se pudo crear el usuario');

    const userId = data.user.id;

    // Crear tienda con las preferencias elegidas en el onboarding
    const { data: newStore, error: storeError } = await supabase
      .from('repmax_stores')
      .insert({
        name: input.storeName,
        slug: input.storeSlug,
        store_type: input.storeType,
        vehicle_focus: input.vehicleFocus,
        theme_key: input.theme,
        country_code: input.country,
      })
      .select()
      .single();
    if (storeError) throw new Error(storeError.message);

    // Crear store_user con rol owner
    const { error: storeUserError } = await supabase
      .from('repmax_store_users')
      .insert({
        store_id: newStore.id,
        user_id: userId,
        role: 'owner',
        full_name: input.email.split('@')[0],
      });
    if (storeUserError) throw new Error(storeUserError.message);

    // onAuthStateChange cargará los datos de tienda automáticamente
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateStore = async (data: Partial<Store>): Promise<void> => {
    if (!state.store) return;

    // Convertir camelCase a snake_case para Supabase
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.address !== undefined) payload.address = data.address;
    if (data.city !== undefined) payload.city = data.city;
    if (data.usdBsRate !== undefined) payload.usd_bs_rate = data.usdBsRate;
    if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl;

    const { data: updated, error } = await supabase
      .from('repmax_stores')
      .update(payload)
      .eq('id', state.store.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setState(s => ({ ...s, store: mapStore(updated) }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
