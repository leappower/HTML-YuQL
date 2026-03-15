#!/usr/bin/env node
/**
 * optimize-images.js — 图片优化脚本（原地替换模式）
 *
 * 执行流程：
 *   1. 将 src/assets/images/ 改名为 src/assets/imagesCopy/（原图备份）
 *   2. 创建新的 src/assets/images/ 目录
 *   3. 遍历 imagesCopy/ 中所有图片文件，按以下规则处理：
 *      - WebP 图片且 ≤ 1MB：直接复制到 images/（已是最优格式）
 *      - WebP 图片且 > 1MB：重新压缩后输出到 images/
 *      - PNG/JPG/JPEG 图片：转换为 WebP 输出到 images/（不保留原格式，IE 已死）
 *      - 其他文件（JSON、SVG 等）：直接复制，保持不变
 *   4. 删除 imagesCopy/ 备份目录
 *
 * 用法：
 *   node scripts/optimize-images.js               # 标准执行（压缩 + 生成 manifest）
 *   node scripts/optimize-images.js --dry-run     # 模拟运行，不执行任何文件操作
 *   node scripts/optimize-images.js --stats       # 仅统计当前 images 目录，不处理
 *   node scripts/optimize-images.js --keep-copy   # 处理完后保留 imagesCopy（调试用）
 *   node scripts/optimize-images.js --gen-manifest  # 仅重新生成 manifest，不处理图片
 *
 * 注意：脚本是幂等的。若 imagesCopy 已存在（上次中断），会直接从 imagesCopy 继续处理。
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ─── 路径配置 ─────────────────────────────────────────────────────────────────
const ASSETS_DIR   = path.join(__dirname, '../src/assets');
const IMAGES_DIR   = path.join(ASSETS_DIR, 'images');
const BACKUP_DIR   = path.join(ASSETS_DIR, 'imagesCopy');

// ─── 命令行参数 ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN      = args.includes('--dry-run');
const STATS_ONLY   = args.includes('--stats');
const KEEP_COPY    = args.includes('--keep-copy');
const GEN_MANIFEST = args.includes('--gen-manifest');

// ─── 压缩参数 ─────────────────────────────────────────────────────────────────
const WEBP_QUALITY   = 85;    // WebP 质量（0-100），85 = 视觉无损
const PNG_QUALITY    = 80;    // PNG palette 调色板颜色数控制（80 ≈ 200 色）
const JPEG_QUALITY   = 82;    // JPEG 压缩质量
const LARGE_THRESHOLD = 1 * 1024 * 1024;  // 1MB：超过此大小的 WebP 也重新压缩

// ─── ANSI 颜色 ────────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
};

function log(msg)    { console.log(`${c.blue}▸${c.reset} ${msg}`); }
function ok(msg)     { console.log(`${c.green}✔${c.reset} ${msg}`); }
function warn(msg)   { console.log(`${c.yellow}⚠${c.reset} ${msg}`); }
function fail(msg)   { console.log(`${c.red}✘${c.reset} ${msg}`); }
function skip(msg)   { console.log(`${c.gray}  ⏭ ${msg}${c.reset}`); }
function title(msg)  { console.log(`\n${c.bold}${c.blue}══ ${msg} ══${c.reset}`); }
function drylog(msg) { console.log(`${c.cyan}[DRY]${c.reset} ${msg}`); }

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getSavings(original, optimized) {
  if (original === 0) return { saved: 0, pct: '0.0' };
  const saved = original - optimized;
  const pct = ((saved / original) * 100).toFixed(1);
  return { saved, pct };
}

function getExt(filename) {
  return path.extname(filename).toLowerCase().replace('.', '');
}

/**
 * 判断文件是否需要处理（压缩或转换）
 * 返回 'compress-webp' | 'compress-png' | 'compress-jpg' | 'copy' | 'drop'
 *
 * 注：PNG/JPG 只转 WebP，不再输出 PNG fallback（IE 已死，WebP 支持率 97%+）
 *     原始 PNG/JPG 文件本身不复制到输出目录（'drop'）
 */
function getAction(filename, fileSize) {
  const ext = getExt(filename);
  if (ext === 'webp') {
    return fileSize > LARGE_THRESHOLD ? 'compress-webp' : 'copy';
  }
  if (ext === 'png') return 'compress-png';
  if (ext === 'jpg' || ext === 'jpeg') return 'compress-jpg';
  // 其他文件（svg、json、mp4 等）直接复制
  return 'copy';
}

/**
 * 处理单个图片文件
 * @param {string} filename  - 文件名（含扩展名）
 * @param {string} srcDir    - 来源目录（imagesCopy）
 * @param {string} destDir   - 目标目录（images）
 * @returns {object} - 处理结果统计
 */
async function processFile(filename, srcDir, destDir) {
  const srcPath  = path.join(srcDir, filename);
  const srcSize  = fs.statSync(srcPath).size;
  const ext      = getExt(filename);
  const basename = path.basename(filename, `.${ext}`);
  const action   = getAction(filename, srcSize);

  const result = {
    filename,
    action,
    srcSize,
    outputs: [],   // [{ path, size, role }]
    error: null,
  };

  if (DRY_RUN) {
    drylog(`${filename}  →  [${action}]  (${formatBytes(srcSize)})`);
    return result;
  }

  try {
    switch (action) {
      case 'copy': {
        // 直接复制（WebP ≤1MB，或非图片文件）
        const destPath = path.join(destDir, filename);
        fs.copyFileSync(srcPath, destPath);
        result.outputs.push({ path: destPath, size: srcSize, role: 'copy' });
        break;
      }

      case 'compress-webp': {
        // 大 WebP 重新压缩
        const destPath = path.join(destDir, filename);
        await sharp(srcPath)
          .webp({ quality: WEBP_QUALITY, effort: 5, alphaQuality: 90 })
          .toFile(destPath);
        const newSize = fs.statSync(destPath).size;
        result.outputs.push({ path: destPath, size: newSize, role: 'webp-recompressed' });
        break;
      }

      case 'compress-png': {
        // PNG → 只输出 WebP（不再保留 PNG，IE 已死，WebP 支持率 97%+）
        const webpDest = path.join(destDir, `${basename}.webp`);

        await sharp(srcPath)
          .webp({
            quality: WEBP_QUALITY,
            lossless: false,
            smartSubsample: true,
            effort: 4,
            alphaQuality: 90,
          })
          .toFile(webpDest);

        result.outputs.push({ path: webpDest, size: fs.statSync(webpDest).size, role: 'webp-from-png' });
        break;
      }

      case 'compress-jpg': {
        // JPG → 只输出 WebP（不再保留 JPG）
        const webpDest = path.join(destDir, `${basename}.webp`);

        await sharp(srcPath)
          .webp({ quality: WEBP_QUALITY, effort: 4 })
          .toFile(webpDest);

        result.outputs.push({ path: webpDest, size: fs.statSync(webpDest).size, role: 'webp-from-jpg' });
        break;
      }
    }
  } catch (err) {
    result.error = err.message;
    fail(`处理失败 ${filename}: ${err.message}`);
    // 降级：直接复制原文件，确保产物完整
    try {
      const fallbackDest = path.join(destDir, filename);
      fs.copyFileSync(srcPath, fallbackDest);
      result.outputs.push({ path: fallbackDest, size: srcSize, role: 'fallback-copy' });
      warn(`已将 ${filename} 原样复制作为 fallback`);
    } catch (copyErr) {
      fail(`fallback 复制也失败: ${copyErr.message}`);
    }
  }

  return result;
}

// ─── 统计模式 ─────────────────────────────────────────────────────────────────
async function runStats() {
  title('当前 images 目录统计');
  if (!fs.existsSync(IMAGES_DIR)) {
    fail(`目录不存在: ${IMAGES_DIR}`);
    return;
  }
  const files = fs.readdirSync(IMAGES_DIR);
  const byExt = {};
  let total = 0;
  files.forEach(f => {
    const ext = getExt(f) || 'other';
    const size = fs.statSync(path.join(IMAGES_DIR, f)).size;
    byExt[ext] = (byExt[ext] || { count: 0, size: 0 });
    byExt[ext].count++;
    byExt[ext].size += size;
    total += size;
  });
  Object.entries(byExt).sort((a,b) => b[1].size - a[1].size).forEach(([ext, s]) => {
    log(`  .${ext.padEnd(6)} ${String(s.count).padStart(4)} 个    ${formatBytes(s.size)}`);
  });
  log(`  ${'合计'.padEnd(7)} ${String(files.length).padStart(4)} 个    ${formatBytes(total)}`);
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────
async function main() {
  title('图片优化（原地替换）');

  if (DRY_RUN) warn('DRY RUN 模式：不会执行任何实际文件操作');
  if (STATS_ONLY) { await runStats(); return; }
  if (GEN_MANIFEST) { generateManifest(); return; }

  // ── Step 1: 确定源目录 ────────────────────────────────────────────────────
  // 幂等处理：若 imagesCopy 已存在（上次中断）则直接使用，否则从 images 改名
  let srcDir;
  if (fs.existsSync(BACKUP_DIR)) {
    warn(`imagesCopy 已存在（上次中断？），直接从备份继续`);
    srcDir = BACKUP_DIR;
  } else if (fs.existsSync(IMAGES_DIR)) {
    log(`Step 1: images → imagesCopy (改名备份)`);
    if (!DRY_RUN) {
      fs.renameSync(IMAGES_DIR, BACKUP_DIR);
    } else {
      drylog(`fs.renameSync(${IMAGES_DIR}, ${BACKUP_DIR})`);
    }
    srcDir = BACKUP_DIR;
  } else {
    fail(`images 目录不存在: ${IMAGES_DIR}`);
    process.exit(1);
  }

  // ── Step 2: 创建新 images 目录 ────────────────────────────────────────────
  log(`Step 2: 创建新的 images/ 目录`);
  if (!DRY_RUN) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  } else {
    drylog(`fs.mkdirSync(${IMAGES_DIR})`);
  }

  // ── Step 3: 处理所有文件 ──────────────────────────────────────────────────
  log(`Step 3: 处理 imagesCopy/ 中的图片`);
  // dry-run 下 rename 未真正执行，fallback 读 images 目录做预览
  const readDir = DRY_RUN ? (fs.existsSync(srcDir) ? srcDir : IMAGES_DIR) : srcDir;
  const files = fs.readdirSync(readDir).filter(f => {
    const stat = fs.statSync(path.join(readDir, f));
    return stat.isFile();  // 只处理文件，跳过子目录
  });

  log(`发现 ${files.length} 个文件`);

  const CONCURRENCY = 4;
  const allResults  = [];

  let totalSrcSize  = 0;
  let totalDestSize = 0;
  let countProcessed = 0;
  let countCopied    = 0;
  let countFailed    = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(f => processFile(f, readDir, IMAGES_DIR))
    );
    allResults.push(...batchResults);

    batchResults.forEach(r => {
      totalSrcSize += r.srcSize;
      const outSize = r.outputs.reduce((s, o) => s + o.size, 0);
      totalDestSize += outSize;

      if (r.error) {
        countFailed++;
      } else if (r.action === 'copy') {
        countCopied++;
        if (!DRY_RUN) skip(`${r.filename}  (${formatBytes(r.srcSize)}, 直接复制)`);
      } else {
        countProcessed++;
        if (!DRY_RUN) {
          const savings = getSavings(r.srcSize, outSize);
          const outLabels = r.outputs.map(o => {
            const ext = path.extname(o.path).slice(1).toUpperCase();
            return `${ext}: ${formatBytes(o.size)}`;
          }).join('  ');
          ok(`${r.filename}  ↓${savings.pct}%  →  ${outLabels}`);
        }
      }
    });
  }

  // ── Step 4: 删除备份目录 ──────────────────────────────────────────────────
  if (KEEP_COPY) {
    warn(`Step 4: --keep-copy 已设置，保留 imagesCopy/`);
  } else {
    log(`Step 4: 删除 imagesCopy/ 备份目录`);
    if (!DRY_RUN) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
      ok(`imagesCopy/ 已删除`);
    } else {
      drylog(`fs.rmSync(${BACKUP_DIR}, { recursive: true })`);
    }
  }

  // ── 输出统计 ──────────────────────────────────────────────────────────────
  console.log('');
  title('优化统计');
  log(`压缩处理: ${countProcessed} 个  直接复制: ${countCopied} 个  失败: ${countFailed} 个`);

  if (!DRY_RUN) {
    const s = getSavings(totalSrcSize, totalDestSize);
    log(`原始总大小:  ${formatBytes(totalSrcSize)}`);
    log(`优化后大小:  ${formatBytes(totalDestSize)}`);
    if (parseFloat(s.pct) > 0) {
      ok(`节省: ${formatBytes(s.saved)}  (↓${s.pct}%)`);
    } else {
      warn(`大小变化: ${formatBytes(Math.abs(s.saved))}  (${parseFloat(s.pct) > 0 ? '↓' : '↑'}${Math.abs(parseFloat(s.pct)).toFixed(1)}%)`);
    }
  }

  ok(`输出目录: ${IMAGES_DIR}`);

  // ── Step 5: 生成 image-manifest.json ─────────────────────────────────────
  // 扫描 images/ 目录，输出所有 WebP 的 basename（不含扩展名）列表
  // 供 image-assets.js 运行时动态构建 IMAGE_ASSETS，无需手动维护硬编码列表
  if (!DRY_RUN) {
    log(`Step 5: 生成 image-manifest.json`);
    generateManifest();
  } else {
    drylog(`生成 image-manifest.json（dry-run 跳过）`);
  }

  if (countFailed > 0) {
    warn(`${countFailed} 个文件处理失败，已用原文件兜底`);
    process.exit(1);
  }
}

/**
 * 扫描 images/ 目录，生成 image-manifest.json
 * 格式：{ "version": 1, "images": ["B1RAC_1", "ESL-4BQ30_1", ...] }
 * 可单独调用：node scripts/optimize-images.js --gen-manifest
 */
function generateManifest() {
  if (!fs.existsSync(IMAGES_DIR)) {
    warn(`images 目录不存在，跳过 manifest 生成`);
    return;
  }

  const webpFiles = fs.readdirSync(IMAGES_DIR)
    .filter(f => f.toLowerCase().endsWith('.webp'))
    .map(f => path.basename(f, '.webp'))
    .sort();

  const manifest = {
    version: 1,
    generated: new Date().toISOString(),
    images: webpFiles,
  };

  const manifestPath = path.join(IMAGES_DIR, 'image-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  ok(`image-manifest.json 已生成，包含 ${webpFiles.length} 张图片`);
}

main().catch(err => {
  fail(`图片优化失败: ${err.message}`);
  console.error(err);
  // 若脚本崩溃且 images 目录不存在，提示用户从 imagesCopy 恢复
  if (!fs.existsSync(IMAGES_DIR) && fs.existsSync(BACKUP_DIR)) {
    fail(`images 目录丢失！请手动执行: mv "${BACKUP_DIR}" "${IMAGES_DIR}" 恢复`);
  }
  process.exit(1);
});
