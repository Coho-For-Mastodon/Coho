import type { Plugin } from 'vite';

export function injectModulepreloadPlugin(): Plugin {
  return {
    name: 'inject-modulepreload',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html: string, { bundle }: { bundle?: Record<string, unknown> }) {
        if (!bundle) return html;

        const chunksToPreload = [
          'auth-session',
          'vendor-idb-keyval',
          'vendor-web-router',
          'firebase',
          'api-client',
        ];
        const preloadLinks: string[] = [];

        for (const chunkPattern of chunksToPreload) {
          const chunk = Object.keys(bundle).find(
            (name) => name.includes(chunkPattern) && name.endsWith('.js')
          );
          if (chunk) {
            preloadLinks.push(`<link rel="modulepreload" href="/${chunk}" />`);
          }
        }

        if (preloadLinks.length > 0) {
          html = html.replace('<head>', `<head>${preloadLinks.join('')}`);
        }

        return html;
      },
    },
  };
}
