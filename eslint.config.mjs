import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const recommendedConfigs = [
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  react.configs.flat.recommended,
  {
    plugins: {
      tseslint,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: false,
        },
      ],
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.all.rules,
      "vitest/prefer-expect-assertions": ["off"],
    },
    settings: {
      vitest: {
        typecheck: true,
      },
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
  },
  {
    files: ["src/**/*.{js,ts,jsx,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      ...reactHooks.configs.recommended.rules,
    },
  },
];

const customConfigs = [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },
  {
    ignores: [".vite/", "coverage/", "build/", "out/", "site/", "*.gen.ts"],
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

export default tseslint.config(...[...recommendedConfigs, ...customConfigs, prettier]);
