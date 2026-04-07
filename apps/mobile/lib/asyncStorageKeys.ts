import AsyncStorage from "@react-native-async-storage/async-storage";

/** Claves actuales alineadas al scope npm `@geemastudio/*`. */
export const ASYNC_STORAGE_TENANT_CONFIG = "@geemastudio/tenant_config";
export const ASYNC_STORAGE_TENANT_CONFIGURED = "@geemastudio/tenant_configured";
export const ASYNC_STORAGE_THEME_PREFERENCE = "@geemastudio/theme_preference";

const LEGACY_TENANT = "@salonpro/tenant_config";
const LEGACY_CONFIGURED = "@salonpro/tenant_configured";
const LEGACY_THEME = "@salonpro/theme_preference";

/** Para `EXPO_PUBLIC_FORCE_FRESH_START`: borrar tenant local nuevo y legacy. */
export const ALL_TENANT_ASYNC_KEYS = [
  ASYNC_STORAGE_TENANT_CONFIG,
  ASYNC_STORAGE_TENANT_CONFIGURED,
  LEGACY_TENANT,
  LEGACY_CONFIGURED,
] as const;

let migrationDone: Promise<void> | null = null;

/**
 * Migra datos de claves antiguas (`@salonpro/*`) a `@geemastudio/*` si la nueva está vacía.
 * Idempotente; una ejecución concurrente por proceso.
 */
export function migrateLegacyAsyncStorageKeys(): Promise<void> {
  if (!migrationDone) {
    migrationDone = (async () => {
      const pairs: Array<[string, string]> = [
        [LEGACY_TENANT, ASYNC_STORAGE_TENANT_CONFIG],
        [LEGACY_CONFIGURED, ASYNC_STORAGE_TENANT_CONFIGURED],
        [LEGACY_THEME, ASYNC_STORAGE_THEME_PREFERENCE],
      ];
      const toRemove: string[] = [];
      for (const [oldKey, newKey] of pairs) {
        const hasNew = await AsyncStorage.getItem(newKey);
        if (hasNew != null) continue;
        const oldVal = await AsyncStorage.getItem(oldKey);
        if (oldVal != null) {
          await AsyncStorage.setItem(newKey, oldVal);
          toRemove.push(oldKey);
        }
      }
      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove);
      }
    })();
  }
  return migrationDone;
}
