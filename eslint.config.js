import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
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
      'no-unused-vars': 'warn',
    }
  }
];
