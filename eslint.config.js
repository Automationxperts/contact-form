import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', '.netlify/**', '.vercel/**', '.wrangler/**'] },

  js.configs.recommended,

  {
    files: ['lib/**/*.js', 'api/**/*.js', 'functions/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.serviceworker },
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^(router|themeManager|branding)$' }],
    },
  },
];
