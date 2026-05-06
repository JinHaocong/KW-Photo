import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/main.ts',
      fileName: () => 'main.js',
      formats: ['es'],
    },
    outDir: 'dist/main',
    rollupOptions: {
      external: ['electron', 'node:crypto', 'node:fs/promises', 'node:path', 'node:process'],
    },
    sourcemap: true,
    target: 'node22',
  },
});
