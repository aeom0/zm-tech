import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  useColorScheme as useSystemColorScheme,
  ColorSchemeName,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "auto" | "light" | "dark";

const STORAGE_KEY = "@salonpro/theme_preference";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("auto");
  const [hydrated, setHydrated] = useState(false);

  // Hidratar preferencia desde AsyncStorage
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored) {
          if (stored === "light" || stored === "dark" || stored === "auto") {
            setPreferenceState(stored);
          }
        }
      } catch {
        // Ignoramos errores de lectura; se usará "auto"
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistPreference = useCallback(async (value: ThemePreference) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignoramos errores de escritura; la preferencia seguirá en memoria
    }
  }, []);

  const handleSetPreference = useCallback(
    (value: ThemePreference) => {
      setPreferenceState(value);
      void persistPreference(value);
    },
    [persistPreference],
  );

  const resolved: "light" | "dark" = (() => {
    if (preference === "light" || preference === "dark") {
      return preference;
    }
    const sys: ColorSchemeName = systemScheme;
    if (sys === "dark") return "dark";
    return "light";
  })();

  const value: ThemeContextValue = {
    preference,
    resolved,
    setPreference: handleSetPreference,
  };

  // Mientras no se hidrate, igual exponemos un valor consistente ("auto")
  // para no bloquear el render inicial.
  if (!hydrated) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemePreference debe usarse dentro de ThemeProvider");
  }
  return ctx;
}

