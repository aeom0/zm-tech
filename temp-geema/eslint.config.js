// https://docs.expo.dev/guides/using-eslint/
const path = require("path");
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ["apps/**/*.{ts,tsx,js,jsx}"],
    settings: {
      "import/resolver": {
        typescript: {
          // Varias entradas: el resolver elige el tsconfig según la ruta del archivo (monorepo)
          project: [
            path.join(__dirname, "apps/mobile/tsconfig.json"),
            path.join(__dirname, "apps/web/tsconfig.json"),
          ],
          noWarnOnMultipleProjects: true,
        },
      },
    },
  },
  {
    ignores: ["dist/*"],
  },
]);
