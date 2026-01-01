import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.stryker-tmp/**',
      'reports/**',
      '*.config.js',
      '*.config.ts',
      '**/*.mjs',
      'drizzle/**/*.sql',
    ],
  },
  
  // Base ESLint recommended rules
  eslint.configs.recommended,
  
  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    rules: {
      // Prevent console.log in production code
      'no-console': ['error', { 
        allow: ['warn', 'error', 'info'] 
      }],
      
      // Unused imports - auto-fixable
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      
      // TypeScript specific rules - disable base rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // General code quality
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'eqeqeq': ['error', 'always'],
      
      // Disable no-undef for TypeScript (TS handles this)
      'no-undef': 'off',
    },
  },
  
  // Test files - allow console.log for debugging tests
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
  
  // Server core files - allow console.log for server startup messages
  {
    files: ['server/_core/**/*.ts'],
    rules: {
      'no-console': ['warn', { 
        allow: ['log', 'warn', 'error', 'info'] 
      }],
    },
  },
];
