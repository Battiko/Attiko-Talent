import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  // Externalize only packages with native bindings or dynamic loading
  external: [
    'pg-native',
    'fsevents',
    'sharp',
    'pino-pretty',
    'pino/file',
  ],
});

console.log('Build complete');
