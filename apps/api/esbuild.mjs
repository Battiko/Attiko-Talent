import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  external: [
    'pg-native',
    'fsevents',
    'sharp',
    'pino-pretty',
    'pino/file',
  ],
  // Required for CJS packages (express, etc.) that use dynamic require() for Node built-ins
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log('Build complete');
