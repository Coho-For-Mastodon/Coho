import type { Plugin } from 'vite';
import path from 'path';

export function serviceWorkerPlugin(rootDir: string, buildVersion: string): Plugin[] {
  return [
    {
      name: 'dev-service-worker',
      apply: 'serve',
      async buildStart() {
        const { build } = await import('vite');
        console.log('[dev-sw] Building service worker for dev...');
        await build({
          configFile: false,
          build: {
            emptyOutDir: false,
            outDir: 'public',
            lib: {
              entry: path.resolve(rootDir, 'src/sw.ts'),
              formats: ['es'],
              fileName: () => 'sw.js',
            },
            rollupOptions: {
              output: {
                inlineDynamicImports: true,
              },
            },
            minify: false,
          },
          define: {
            '__APP_VERSION__': JSON.stringify(buildVersion),
            'process.env.NODE_ENV': JSON.stringify('development'),
          },
        });
        console.log('[dev-sw] Service worker built successfully');
      },
    },
    {
      name: 'build-sw',
      apply: 'build',
      async closeBundle() {
        const { build } = await import('vite');
        console.log('[build-sw] Building service worker...');
        await build({
          configFile: false,
          build: {
            emptyOutDir: false,
            outDir: 'dist',
            lib: {
              entry: path.resolve(rootDir, 'src/sw.ts'),
              formats: ['es'],
              fileName: () => 'sw.js',
            },
            rollupOptions: {
              output: {
                inlineDynamicImports: true,
              },
            },
            minify: 'terser',
            terserOptions: {
              module: true,
              compress: {
                drop_console: false,
                drop_debugger: true,
              },
              format: {
                comments: false,
              },
            },
          },
          define: {
            '__APP_VERSION__': JSON.stringify(buildVersion),
            'process.env.NODE_ENV': JSON.stringify('production'),
          },
        });
        console.log('[build-sw] Service worker built successfully');
      },
    }
  ];
}
