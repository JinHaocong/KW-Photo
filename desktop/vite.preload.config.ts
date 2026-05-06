import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/preload.ts',
      fileName: () => 'preload.cjs',
      formats: ['cjs'],
    },
    outDir: 'dist/preload',
    rollupOptions: {
      external: ['electron'],
    },
    sourcemap: true,
    target: 'node22',
  },
});
