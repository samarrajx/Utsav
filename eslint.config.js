import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: ["node_modules/**", ".vercel/**", "coverage/**"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-control-regex": "off",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      complexity: ["error", 12],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    files: ["tests/**/*.js"],
    rules: {
      "max-lines-per-function": "off"
    }
  }
];
