import type { Plugin } from 'vite';

export function minifyLitCssPlugin(): Plugin {
  return {
    name: 'minify-lit-css',
    enforce: 'pre',
    apply: 'build',
    transform(code: string, id: string) {
      if (!/\.(ts|js|tsx|jsx)$/.test(id)) return null;
      if (!code.includes('css`')) return null;
      
      const minified = minifyCssTemplateLiterals(code);
      if (minified !== code) {
        return { code: minified, map: null };
      }
      return null;
    },
  };
}

function minifyCssTemplateLiterals(code: string): string {
  const result: string[] = [];
  let i = 0;
  let changed = false;
  
  while (i < code.length) {
    const tagIndex = code.indexOf('css`', i);
    if (tagIndex === -1) {
      result.push(code.slice(i));
      break;
    }
    
    if (tagIndex > 0 && /\w/.test(code[tagIndex - 1])) {
      result.push(code.slice(i, tagIndex + 4));
      i = tagIndex + 4;
      continue;
    }
    
    result.push(code.slice(i, tagIndex + 4));
    i = tagIndex + 4;
    
    const { end, minified } = walkTemplateLiteral(code, i);
    if (minified !== code.slice(i, end)) changed = true;
    result.push(minified);
    i = end;
  }
  
  return changed ? result.join('') : code;
}

function walkTemplateLiteral(code: string, start: number): { end: number; minified: string } {
  const parts: string[] = [];
  let i = start;
  let currentCss = '';
  
  while (i < code.length) {
    const ch = code[i];
    
    if (ch === '\\') {
      currentCss += code[i] + code[i + 1];
      i += 2;
      continue;
    }
    
    if (ch === '`') {
      parts.push(minifyCssString(currentCss));
      return { end: i + 1, minified: parts.join('') + '`' };
    }
    
    if (ch === '$' && code[i + 1] === '{') {
      parts.push(minifyCssString(currentCss));
      currentCss = '';
      
      const exprEnd = findExpressionEnd(code, i + 2);
      parts.push(code.slice(i, exprEnd));
      i = exprEnd;
      continue;
    }
    
    currentCss += ch;
    i++;
  }
  
  return { end: code.length, minified: code.slice(start) };
}

function findExpressionEnd(code: string, start: number): number {
  let depth = 1;
  let i = start;
  
  while (i < code.length && depth > 0) {
    const ch = code[i];
    
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; if (depth === 0) return i + 1; i++; continue; }
    
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(code, i);
      continue;
    }
    
    if (ch === '/' && code[i + 1] === '/') {
      i = code.indexOf('\n', i + 2);
      if (i === -1) return code.length;
      continue;
    }
    
    if (ch === '/' && code[i + 1] === '*') {
      i = code.indexOf('*/', i + 2);
      if (i === -1) return code.length;
      i += 2;
      continue;
    }
    
    i++;
  }
  
  return i;
}

function skipString(code: string, start: number): number {
  const quote = code[start];
  let i = start + 1;
  
  if (quote === '`') {
    while (i < code.length) {
      if (code[i] === '\\') { i += 2; continue; }
      if (code[i] === '`') return i + 1;
      if (code[i] === '$' && code[i + 1] === '{') {
        i = findExpressionEnd(code, i + 2);
        continue;
      }
      i++;
    }
    return i;
  }
  
  while (i < code.length) {
    if (code[i] === '\\') { i += 2; continue; }
    if (code[i] === quote) return i + 1;
    i++;
  }
  return i;
}

function minifyCssString(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}
