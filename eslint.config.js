import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['packages/client-app/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        AudioContext: 'readonly',
        MediaStream: 'readonly',
        ScriptProcessorNode: 'readonly',
        MediaStreamAudioSourceNode: 'readonly',
        SpeechRecognition: 'readonly',
        SpeechRecognitionEvent: 'readonly',
        SpeechRecognitionErrorEvent: 'readonly',
        EventTarget: 'readonly',
        Event: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',
        MessageChannel: 'readonly',
        queueMicrotask: 'readonly',
        TextDecoder: 'readonly',
        AbortSignal: 'readonly',
        RequestInit: 'readonly',
        __REACT_DEVTOOLS_GLOBAL_HOOK__: 'readonly',
        reportError: 'readonly',
        MSApp: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    files: [
      'packages/server/**/*.{ts,tsx}',
      'packages/shared/**/*.{ts,tsx}',
      'packages/engines/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        TextDecoder: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    files: ['test/**/*.{ts,tsx}', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.js',
      'packages/client-app/dist/',
      '**/dist/**',
      '**/node_modules/**',
    ],
  },
];
