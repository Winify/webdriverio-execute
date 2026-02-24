import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'build',
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
