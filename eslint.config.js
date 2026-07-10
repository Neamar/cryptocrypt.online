import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// Deliberately the non-type-checked preset: `npm run typecheck` (tsc) already does
// type-aware checking, keeping eslint fast and dependency-light.
export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      semi: "error",
      'prefer-template': 'error',
      'no-constant-condition': 0,
      '@typescript-eslint/no-unused-vars': 'warn',
    }
  }
);
