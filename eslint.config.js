// https://docs.expo.dev/guides/using-eslint/
const path = require("path");
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ["apps/mobile/**/*.{ts,tsx,js,jsx}"],
    settings: {
      "import/resolver": {
        typescript: {
          project: path.join(__dirname, "apps/mobile/tsconfig.json"),
        },
      },
    },
  },
  {
    ignores: ["dist/*"],
  },
]);
