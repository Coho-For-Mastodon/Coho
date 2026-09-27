import type { Plugin } from 'vite';

export function minifyLitHtmlPlugin(): Plugin {
  return {
    name: 'minify-lit-html',
    enforce: 'pre',
    apply: 'build',
    transform(code: string, id: string) {
      if (!/\.(ts|js|tsx|jsx)$/.test(id)) return null;
      if (!code.includes('html`')) return null;

      const minified = code.replace(/html`([\s\S]*?)`/g, (match, html) => {
        const minifiedHtml = html
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/>\s+</g, '><')
          .replace(/\s+/g, ' ')
          .replace(/>\s+\$/g, '>$')
          .replace(/\$\s+</g, '$<')
          .replace(/"\s+>/g, '">')
          .replace(/'\s+>/g, "'>")
          .trim();
        return `html\`${minifiedHtml}\``;
      });

      if (minified !== code) {
        return { code: minified, map: null };
      }

      return null;
    },
  };
}
