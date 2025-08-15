import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['../../test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@voice/config': resolve(__dirname, '../shared/config/src'),
      '@voice/schemas': resolve(__dirname, '../shared/schemas/src'),
      '@voice/observability': resolve(__dirname, '../shared/observability/src'),
      '@voice/llm-manager': resolve(__dirname, '../engines/llm-manager/src'),
      '@voice/stt-whisper-cpp': resolve(__dirname, '../engines/stt-whisper-cpp/src'),
      '@voice/tts-piper': resolve(__dirname, '../engines/tts-piper/src')
    }
  }
});
