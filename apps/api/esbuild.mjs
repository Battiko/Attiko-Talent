import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  plugins: [{
    name: 'externalize-deps',
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        const p = args.path;
        // Leave relative imports and node: builtins alone
        if (p.startsWith('.') || p.startsWith('/') || p.startsWith('node:')) return null;
        // Bundle @attiko/* workspace packages inline
        if (p.startsWith('@attiko/')) return null;
        // Externalize all other npm packages
        return { external: true, path: p };
      });
    },
  }],
});

console.log('Build complete');
