import globals from "globals";
import pluginJS from "@eslint/js";
import pluginTS from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginJest from "eslint-plugin-jest";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

const recommendedConfigs = [
  pluginJS.configs.recommended,
  ...pluginTS.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginJest.configs["flat/recommended"],

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
    ignores: [".next/", "coverage/", ".vite/"],
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
