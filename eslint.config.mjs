import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Desktop converter uses Node APIs — relax browser-specific rules there
    files: ['desktop-converter/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Ignore generated build output, dist, and node_modules
    ignores: ['dist/**', '.desktop-build/**', 'node_modules/**', 'desktop-converter/dist/**'],
  },
);
