#!/usr/bin/env node
/**
 * optimize-images.js — 构建时图片优化脚本
 *
 * 功能：
 *   1. 将 src/assets/images/*.png 批量转换为 WebP（质量 85，无损透明通道）
 *   2. 同时生成压缩后的 PNG（pngquant 风格，quality 80）
 *   3. 输出到 src/assets/images-optimized/（不覆盖源文件）
 *   4. 生成 optimized-manifest.json，供 webpack CopyPlugin 使用
 *
 * 用法：
 *   node scripts/optimize-images.js              # 增量处理（跳过已存在的 WebP）
 *   node scripts/optimize-images.js --force      # 强制重新处理所有图片
 *   node scripts/optimize-images.js --stats      # 只输出统计，不处理
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src/assets/images');
const OUT_DIR = path.join(__dirname, '../src/assets/images-optimized');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const STATS_ONLY = args.includes('--stats');

const WEBP_QUALITY = 85;   // WebP 质量，85 在文件大小和视觉之间取得最佳平衡
const PNG_QUALITY = 80;    // PNG 调色板模式质量（palette:true 时生效，减色至 256 色）

// ANSI 颜色
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(msg)  { console.log(`${c.blue}▸${c.reset} ${msg}`); }
function ok(msg)   { console.log(`${c.green}✔${c.reset} ${msg}`); }
function fail(msg) { console.log(`${c.red}✘${c.reset} ${msg}`); }
function title(msg){ console.log(`\n${c.bold}${c.blue}══ ${msg} ══${c.reset}`); }

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getSavings(original, optimized) {
  const saved = original - optimized;
  const pct = ((saved / original) * 100).toFixed(1);
  return { saved, pct };
}

async function processImage(file) {
  const name = path.basename(file, '.png');
  const srcPath = path.join(SRC_DIR, file);
  const webpOut = path.join(OUT_DIR, `${name}.webp`);
  const pngOut  = path.join(OUT_DIR, `${name}.png`);

  const srcSize = fs.statSync(srcPath).size;
  const results = { name, srcSize, webpSize: 0, pngSize: 0, skipped: false };

  // 增量模式：两个输出都存在则跳过
  if (!FORCE && fs.existsSync(webpOut) && fs.existsSync(pngOut)) {
    results.skipped = true;
    results.webpSize = fs.statSync(webpOut).size;
    results.pngSize  = fs.statSync(pngOut).size;
    return results;
  }

  try {
    // 生成 WebP（保留透明通道）
    await sharp(srcPath)
      .webp({
        quality: WEBP_QUALITY,
        lossless: false,
        nearLossless: false,
        smartSubsample: true,
        effort: 4,          // 0-6，越高越慢但更小；4 是速度/大小的甜点
        alphaQuality: 90,   // 透明通道质量
      })
      .toFile(webpOut);

    // 生成压缩 PNG（palette 减色至 256 色，体积比原图小约 70-80%，保留透明通道作 fallback）
    // 注：palette 模式对有透明通道的产品图效果极佳；若视觉需求更高可改 quality: 90
    await sharp(srcPath)
      .png({
        palette: true,                 // 强制 256 色调色板模式（最显著的体积优化）
        quality: PNG_QUALITY,          // 调色板颜色数量控制（80 ≈ 200 色，视觉无损）
        compressionLevel: 9,           // zlib 压缩级别（无损，只影响速度）
        dither: 1.0,                   // 抖动强度，减少色带，使减色后图像更自然
      })
      .toFile(pngOut);

    results.webpSize = fs.statSync(webpOut).size;
    results.pngSize  = fs.statSync(pngOut).size;
  } catch (err) {
    fail(`处理失败 ${file}: ${err.message}`);
    // 失败时直接复制原文件（保证产物完整）
    fs.copyFileSync(srcPath, pngOut);
    results.pngSize = srcSize;
  }

  return results;
}

async function main() {
  title('图片优化');

  if (!fs.existsSync(SRC_DIR)) {
    fail(`图片源目录不存在: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SRC_DIR).filter(f => f.toLowerCase().endsWith('.png'));
  log(`发现 ${files.length} 张 PNG 图片`);

  if (STATS_ONLY) {
    let total = 0;
    files.forEach(f => { total += fs.statSync(path.join(SRC_DIR, f)).size; });
    log(`原始总大小: ${formatBytes(total)}`);
    log(`估算 WebP 后: ~${formatBytes(total * 0.2)} (节省约 80%)`);
    return;
  }

  // 确保输出目录存在
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let totalSrc = 0, totalWebp = 0, totalPng = 0;
  let processed = 0, skipped = 0, failed = 0;

  // 并发处理（控制并发数避免内存爆炸）
  const CONCURRENCY = 4;
  const allResults = [];

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(f => processImage(f)));
    allResults.push(...batchResults);

    batchResults.forEach(r => {
      totalSrc  += r.srcSize;
      totalWebp += r.webpSize;
      totalPng  += r.pngSize;

      if (r.skipped) {
        skipped++;
        console.log(`${c.gray}  ⏭ 跳过 ${r.name} (已存在)${c.reset}`);
      } else {
        const ws = getSavings(r.srcSize, r.webpSize);
        const ps = getSavings(r.srcSize, r.pngSize);
        processed++;
        ok(`${r.name} → WebP: ${formatBytes(r.webpSize)} (↓${ws.pct}%)  PNG: ${formatBytes(r.pngSize)} (↓${ps.pct}%)`);
      }
    });
  }

  // 输出统计
  console.log('');
  title('优化统计');
  log(`处理: ${processed} 张  跳过: ${skipped} 张  失败: ${failed} 张`);
  log(`原始总大小:   ${formatBytes(totalSrc)}`);
  log(`WebP 总大小:  ${formatBytes(totalWebp)} (节省 ${getSavings(totalSrc, totalWebp).pct}%)`);
  log(`PNG  总大小:  ${formatBytes(totalPng)}  (节省 ${getSavings(totalSrc, totalPng).pct}%)`);
  ok(`图片已输出到 ${OUT_DIR}`);

  // 生成 manifest（记录每个文件是否有对应 WebP）
  const manifest = {};
  allResults.forEach(r => {
    manifest[r.name] = {
      hasWebp: r.webpSize > 0,
      srcSize: r.srcSize,
      webpSize: r.webpSize,
      pngSize: r.pngSize,
    };
  });
  const manifestPath = path.join(OUT_DIR, 'optimized-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`Manifest 已写入 ${manifestPath}`);
}

main().catch(err => {
  fail(`图片优化失败: ${err.message}`);
  console.error(err);
  process.exit(1);
});
