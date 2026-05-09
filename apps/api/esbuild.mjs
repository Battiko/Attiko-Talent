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
      // Externalize all npm packages except @attiko/* workspace packages
      build.onResolve({ filter: /^(?!node:|@attiko\/)(@[^/]+\/[^/]+|[^@./][^/]*)/ }, args => ({
        external: true,
        path: args.path,
      }));
    },
  }],
});

console.log('Build complete');
