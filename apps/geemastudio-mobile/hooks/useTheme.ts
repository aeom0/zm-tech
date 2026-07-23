import { createTheme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTenant } from "@/contexts/TenantContext";

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { config } = useTenant();
  const theme = createTheme(config, isDark);

  return {
    theme,
    isDark,
  };
}
