import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importX from "eslint-plugin-import-x";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

export default defineConfig(
  { ignores: ["dist", "node_modules", "*.config.*"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      prettier: prettier as unknown as Record<string, unknown>,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@eslint-react": eslintReact,
      "jsx-a11y": jsxA11y,
      "import-x": importX,
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      "prettier/prettier": ["error", { useTabs: true, doubleQuote: true }],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        { allowExpressions: true },
      ],
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@eslint-community/eslint-comments/no-use": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
);
