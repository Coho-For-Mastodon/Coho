#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Lazy imports to keep startup fast and dependencies minimal
let imagemin;
let mozjpeg;
let pngquant;
let webpPlugin;
let svgo;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_DIRS = [path.join(ROOT, 'public'), path.join(ROOT, 'src')];
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg']);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.github',
  '.vite',
  'lib',
  'functions',
]);

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run') || args.has('-n'),
    verbose: args.has('--verbose') || args.has('-v'),
  };
}

async function listFiles(dir, files = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (_e) {
    return files; // Ignore missing dirs
  }
  for (const entry of entries) {
    // Skip hidden directories like .git, .vite, etc.
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      await listFiles(path.join(dir, entry.name), files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val < 10 && i > 0 ? 2 : 1)} ${sizes[i]}`;
}

async function ensureDeps() {
  if (!imagemin) {
    imagemin = (await import('imagemin')).default;
  }
  if (!mozjpeg) {
    mozjpeg = (await import('imagemin-mozjpeg')).default;
  }
  if (!pngquant) {
    pngquant = (await import('imagemin-pngquant')).default;
  }
  if (!webpPlugin) {
    try {
      webpPlugin = (await import('imagemin-webp')).default;
    } catch {
      // optional - webp optimization not critical
      webpPlugin = null;
    }
  }
  if (!svgo) {
    svgo = await import('svgo');
  }
}

async function optimizeSvg(filePath, dryRun, verbose) {
  const source = await fs.readFile(filePath, 'utf8');
  const before = Buffer.byteLength(source);
  const result = svgo.optimize(source, {
    path: filePath,
    multipass: true,
    plugins: [
      'preset-default',
      { name: 'removeViewBox', active: false },
      { name: 'cleanupIds', active: true },
      { name: 'removeUnknownsAndDefaults', active: true },
      { name: 'removeUselessStrokeAndFill', active: true },
    ],
  });
  const out = result.data;
  const after = Buffer.byteLength(out);
  const saved = before - after;
  if (saved > 0) {
    if (!dryRun) await fs.writeFile(filePath, out, 'utf8');
    if (verbose)
      console.log(
        `svg  ${formatBytes(before)} -> ${formatBytes(after)}  ${path.relative(ROOT, filePath)}`
      );
    return { optimized: true, before, after, saved };
  }
  return { optimized: false, before, after, saved: 0 };
}

async function optimizeRaster(filePath, dryRun, verbose) {
  const ext = path.extname(filePath).toLowerCase();
  const before = (await fs.stat(filePath)).size;
  const input = await fs.readFile(filePath);
  let outBuffer = null;

  if (ext === '.jpg' || ext === '.jpeg') {
    outBuffer = await imagemin.buffer(input, {
      plugins: [mozjpeg({ quality: 77, progressive: true })],
    });
  } else if (ext === '.png') {
    outBuffer = await imagemin.buffer(input, {
      plugins: [pngquant({ quality: [0.65, 0.8], strip: true, speed: 3 })],
    });
  } else if (ext === '.webp' && webpPlugin) {
    outBuffer = await imagemin.buffer(input, {
      plugins: [webpPlugin({ quality: 77, method: 4 })],
    });
  } else if (ext === '.avif') {
    // Skipping AVIF for now to avoid heavy deps; return unchanged
    return { optimized: false, before, after: before, saved: 0 };
  } else {
    return { optimized: false, before, after: before, saved: 0 };
  }

  const after = outBuffer.length;
  const saved = before - after;

  if (saved > 0) {
    if (!dryRun) await fs.writeFile(filePath, outBuffer);
    if (verbose)
      console.log(
        `${ext.slice(1).padEnd(4)} ${formatBytes(before)} -> ${formatBytes(after)}  ${path.relative(ROOT, filePath)}`
      );
    return { optimized: true, before, after, saved };
  }
  return { optimized: false, before, after, saved: 0 };
}

async function main() {
  const { dryRun, verbose } = parseArgs();

  console.log('🖼️  Image Optimization Tool');
  console.log('==========================\n');

  if (dryRun) {
    console.log('🔍 Running in dry-run mode (no files will be modified)\n');
  }

  await ensureDeps();

  const dirs = DEFAULT_DIRS;
  const files = (await Promise.all(dirs.map((d) => listFiles(d)))).flat();

  if (files.length === 0) {
    console.log('No images found to optimize.');
    return;
  }

  const rasterFiles = files.filter((f) =>
    ['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(
      path.extname(f).toLowerCase()
    )
  );
  const svgFiles = files.filter(
    (f) => path.extname(f).toLowerCase() === '.svg'
  );

  console.log(
    `Found ${files.length} image(s): ${svgFiles.length} SVG, ${rasterFiles.length} raster\n`
  );

  let optimizedCount = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  // SVG first (synchronous enough)
  for (const f of svgFiles) {
    const res = await optimizeSvg(f, dryRun, verbose);
    if (res) {
      totalBefore += res.before;
      totalAfter += res.after;
      if (res.optimized) optimizedCount += 1;
    }
  }

  // Raster in batches to avoid too many concurrent decodes
  for (const f of rasterFiles) {
    const res = await optimizeRaster(f, dryRun, verbose);
    if (res) {
      totalBefore += res.before;
      totalAfter += res.after;
      if (res.optimized) optimizedCount += 1;
    }
  }

  const totalSaved = Math.max(0, totalBefore - totalAfter);
  const percentSaved =
    totalBefore > 0 ? ((totalSaved / totalBefore) * 100).toFixed(1) : 0;

  console.log('\n' + '='.repeat(50));
  console.log(
    `✅ Checked ${files.length} image(s) in ${dirs.map((d) => path.relative(ROOT, d)).join(', ')}`
  );
  console.log(`📊 Optimized ${optimizedCount} file(s)`);
  console.log(
    `💾 Savings: ${formatBytes(totalSaved)} (${percentSaved}% reduction)`
  );
  console.log(
    `📈 ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)}${dryRun ? ' [dry-run]' : ''}`
  );

  // Exit non-zero if in CI dry run and there are savings, to encourage running the fixer
  if (dryRun && totalSaved > 0 && process.env.CI) {
    console.log(
      '\n⚠️  Unoptimized images detected in CI. Run `npm run optimize-images` to fix.'
    );
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('❌ Error during image optimization:', err);
  process.exit(1);
});
