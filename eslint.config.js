import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['web/dist', 'node_modules', 'data', 'coverage'],
  },

  // Base JS + TS recommended
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Vendor-boundary JSON and loose SSE payloads are cast to `any` by design
  // (see MIGRATION.md) — flag it as a warning, don't fail the lint on it.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Type-aware linting: match each file to the tsconfig that includes it.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.server.json', './tsconfig.web.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Root-level config files aren't in any tsconfig — lint them without type info.
  {
    files: ['*.{js,ts}'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['*.{js,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Backend + scripts: Node globals
  {
    files: ['server/**/*.{ts,js}', 'scripts/**/*.{ts,js}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Frontend: browser globals + React rules
  {
    files: ['web/**/*.{ts,tsx,js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The classic hook rules stay on; the newer React-Compiler lints in the v7
      // recommended set flag intentional patterns in this demo, so keep them off.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // Test files: allow node + browser globals
  {
    files: ['**/*.test.{ts,tsx}', 'vitest.setup.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Prettier last — turn off formatting rules that would fight Prettier
  prettier,
)
