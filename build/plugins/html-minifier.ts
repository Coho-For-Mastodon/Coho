import type { Plugin } from 'vite';

export function htmlMinifierPlugin(): Plugin {
  return {
    name: 'html-minifier',
    enforce: 'post',
    transformIndexHtml(html: string) {
      html = html.replace(
        /<style>([\s\S]*?)<\/style>/g,
        (match: string, css: string) => {
          const minifiedCss = css
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\n\s*/g, '')
            .replace(/\s*([{}:;,])\s*/g, '$1')
            .replace(/;\}/g, '}')
            .replace(/\s+/g, ' ')
            .trim();
          return `<style>${minifiedCss}</style>`;
        }
      );

      return html
        .replace(/\n\s+/g, '\n')
        .replace(/\n+/g, '\n')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
    },
  };
}
