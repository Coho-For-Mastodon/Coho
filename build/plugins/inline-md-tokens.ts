import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import path from 'path';

export function inlineMdTokensPlugin(rootDir: string): Plugin {
  return {
    name: 'inline-md-tokens',
    enforce: 'pre',
    transformIndexHtml(html: string) {
      const tokensPath = path.resolve(rootDir, 'src/styles/md-tokens.css');
      const css = readFileSync(tokensPath, 'utf-8');
      return html.replace(
        /<!-- md-tokens\.css is inlined by the inline-md-tokens Vite plugin -->/,
        `<style>${css}</style>`
      );
    },
  };
}
