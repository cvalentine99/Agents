import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
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
    },
    rules: {
      // Prevent console.log in production code
      'no-console': ['error', { 
        allow: ['warn', 'error', 'info'] 
      }],
      
      // TypeScript specific rules - disable base rule in favor of TS version
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
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
