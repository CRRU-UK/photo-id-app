import pluginJS from "@eslint/js";
import pluginVitest from "@vitest/eslint-plugin";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import pluginTS from "typescript-eslint";

const recommendedConfigs = [
  pluginJS.configs.recommended,
  ...pluginTS.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.test.ts", "**/*.test.tsx"], // or any other pattern
    plugins: {
      vitest: pluginVitest,
    },
    rules: {
      ...pluginVitest.configs.recommended.rules,
    },
  },

  // Custom config until packages support flat configs
  {
    files: ["src/**/*.{js,ts,jsx,tsx}"],
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
];

const customConfigs = [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },
  {
    ignores: [".vite/", "coverage/", "*.gen.ts"],
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];

export default [...recommendedConfigs, ...customConfigs, eslintPluginPrettierRecommended];
