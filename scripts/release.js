#!/usr/bin/env node
/**
 * release.js — 打包发布脚本
 *
 * 用法：
 *   node scripts/release.js                  # 默认 patch 递增（1.0.0 → 1.0.1）
 *   node scripts/release.js --minor          # minor 递增（1.0.0 → 1.1.0）
 *   node scripts/release.js --major          # major 递增（1.0.0 → 2.0.0）
 *   node scripts/release.js --version=1.2.3  # 指定版本
 *   node scripts/release.js --dry-run        # 预演：只打印计划，不执行任何操作
 *   node scripts/release.js --skip-build     # 跳过打包（已有 dist 时调试用）
 *   node scripts/release.js --skip-lint      # 跳过 lint 检查
 *
 * 流程：
 *   1. 从远端读取最新 release 分支，解析当前版本号
 *   2. 计算新版本号
 *   3. lint 检查（--skip-lint 可跳过）
 *   4. 执行打包（--skip-build 可跳过）
 *   5. 创建新的 release/vX.Y.Z 分支（孤立分支，仅含产物）
 *   6. 提交产物并推送到远端
 *   7. 打印发布摘要
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── 颜色输出 ────────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};
const log  = (msg)        => console.log(`${c.cyan}▸${c.reset} ${msg}`);
const ok   = (msg)        => console.log(`${c.green}✔${c.reset} ${msg}`);
const warn = (msg)        => console.log(`${c.yellow}⚠${c.reset} ${msg}`);
const fail = (msg, e)     => { console.error(`${c.red}✘${c.reset} ${msg}`); if (e) console.error(c.gray + e.message + c.reset); };
const title= (msg)        => console.log(`\n${c.bold}${c.blue}══ ${msg} ══${c.reset}`);
const drylog=(msg)        => console.log(`${c.yellow}[dry-run]${c.reset} ${msg}`);

// ─── 参数解析 ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opts = {
  major:     args.includes('--major'),
  minor:     args.includes('--minor'),
  dryRun:    args.includes('--dry-run'),
  skipBuild: args.includes('--skip-build'),
  skipLint:  args.includes('--skip-lint'),
  version:   (args.find(a => a.startsWith('--version=')) || '').replace('--version=', ''),
};

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const tmpDir = path.join(ROOT, '.release-tmp');

/** 执行命令，返回 stdout 字符串（失败时抛出） */
function run(cmd, options = {}) {
  const { silent = false, cwd = ROOT } = options;
  if (!silent) log(cmd);
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    throw new Error(`命令失败: ${cmd}\n${e.stderr || e.message}`);
  }
}

/** 执行命令，继承 stdio（用于有实时输出的长命令）*/
function runLive(cmd, options = {}) {
  const { cwd = ROOT } = options;
  log(cmd);
  const result = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`命令失败（exit ${result.status}）: ${cmd}`);
  }
}

/** 语义版本解析 */
function parseVersion(v) {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-.*)?$/);
  if (!m) throw new Error(`无效版本号: "${v}"，格式应为 X.Y.Z`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

/** 语义版本格式化 */
function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

/** 递增版本 */
function bumpVersion(current, type) {
  const v = parseVersion(current);
  if (type === 'major') return formatVersion({ major: v.major + 1, minor: 0, patch: 0 });
  if (type === 'minor') return formatVersion({ major: v.major, minor: v.minor + 1, patch: 0 });
  return formatVersion({ major: v.major, minor: v.minor, patch: v.patch + 1 }); // patch
}

/** 清理临时 worktree（SIGINT/SIGTERM 时也调用）*/
function cleanupWorktree() {
  try { run(`git worktree remove --force "${tmpDir}"`, { silent: true }); } catch (_) { /* ignore */ }
  try { if (fs.existsSync(tmpDir)) run(`rm -rf "${tmpDir}"`, { silent: true }); } catch (_) { /* ignore */ }
}

// 捕获 Ctrl+C / kill 信号，确保 worktree 被清理
process.on('SIGINT',  () => { warn('\n中断信号，正在清理...'); cleanupWorktree(); process.exit(130); });
process.on('SIGTERM', () => { warn('\n终止信号，正在清理...'); cleanupWorktree(); process.exit(143); });

// ─── Step 1: 读取远端最新 release 版本 ───────────────────────────────────────
title('Step 1  读取远端 release 版本');

log('正在 fetch 远端分支信息...');
try {
  run('git fetch --prune origin', { silent: true });
  ok('fetch 完成');
} catch (e) {
  warn('fetch 失败，将使用本地缓存的远端信息');
}

// 列出所有远端 release/vX.Y.Z 分支，取最新版本
let currentVersion = '0.0.0';
try {
  const branches = run('git branch -r', { silent: true });
  const releasePattern = /origin\/release\/v(\d+\.\d+\.\d+)/g;
  const versions = [];
  let m;
  while ((m = releasePattern.exec(branches)) !== null) {
    versions.push(m[1]);
  }

  if (versions.length > 0) {
    // 语义版本排序，取最大值
    versions.sort((a, b) => {
      const va = parseVersion(a), vb = parseVersion(b);
      if (va.major !== vb.major) return va.major - vb.major;
      if (va.minor !== vb.minor) return va.minor - vb.minor;
      return va.patch - vb.patch;
    });
    currentVersion = versions[versions.length - 1];
    ok(`当前最新 release 版本: ${c.bold}v${currentVersion}${c.reset}`);
  } else {
    warn('未找到任何 release/vX.Y.Z 分支，将从 v0.0.0 开始');
  }
} catch (e) {
  warn(`读取 release 分支失败，将从 v0.0.0 开始: ${e.message}`);
}

// ─── Step 2: 计算新版本 ───────────────────────────────────────────────────────
title('Step 2  计算新版本号');

let newVersion;
if (opts.version) {
  // 指定版本
  try {
    parseVersion(opts.version); // 验证格式
    newVersion = opts.version.replace(/^v/, '');
    log(`使用指定版本: v${newVersion}`);
  } catch (e) {
    fail(`--version 参数无效: ${opts.version}`);
    process.exit(1);
  }
} else {
  // 自动递增
  const bumpType = opts.major ? 'major' : opts.minor ? 'minor' : 'patch';
  newVersion = bumpVersion(currentVersion, bumpType);
  log(`${bumpType} 递增: v${currentVersion} → v${c.bold}${c.green}${newVersion}${c.reset}`);
}

const releaseBranch = `release/v${newVersion}`;

// 检查目标分支是否已存在
try {
  const existing = run('git branch -r', { silent: true });
  if (existing.includes(`origin/${releaseBranch}`)) {
    fail(`远端分支 ${releaseBranch} 已存在，请指定更高版本或使用 --version 覆盖`);
    process.exit(1);
  }
} catch (_) { /* 无法读取远端分支列表，跳过检查 */ }

ok(`目标发布分支: ${c.bold}${releaseBranch}${c.reset}`);

// ─── Step 2b: 同步更新 package.json 版本号 ───────────────────────────────────
if (!opts.dryRun) {
  try {
    const pkgPath = path.join(ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version !== newVersion) {
      pkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      ok(`package.json version 已更新 → ${newVersion}`);
    }
  } catch (e) {
    warn(`无法更新 package.json version: ${e.message}（不影响发布流程）`);
  }
}

if (opts.dryRun) {
  drylog('─────────────────────────────────────────');
  drylog(`当前版本: v${currentVersion}`);
  drylog(`新版本:   v${newVersion}`);
  drylog(`目标分支: ${releaseBranch}`);
  drylog('后续步骤: lint → build → 推送产物');
  drylog('dry-run 模式，不执行任何实际操作');
  drylog('─────────────────────────────────────────');
  process.exit(0);
}

// ─── Step 3: Lint 检查 ────────────────────────────────────────────────────────
title('Step 3  Lint 检查');

if (opts.skipLint) {
  warn('已跳过 lint（--skip-lint）');
} else {
  try {
    runLive('npm run lint:all');
    ok('lint 检查通过');
  } catch (e) {
    fail('lint 检查失败，请修复后重试（或使用 --skip-lint 跳过）');
    process.exit(1);
  }
}

// ─── Step 4: 打包构建 ─────────────────────────────────────────────────────────
title('Step 4  打包构建');

if (opts.skipBuild) {
  warn('已跳过打包（--skip-build），使用现有 dist/');
  if (!fs.existsSync(path.join(ROOT, 'dist'))) {
    fail('dist/ 目录不存在，无法跳过打包');
    process.exit(1);
  }
} else {
  try {
    runLive('npm run build:static');
    ok('打包完成');
  } catch (e) {
    fail('打包失败，请检查构建日志');
    process.exit(1);
  }
}

// 检查 dist 产物
const distDir = path.join(ROOT, 'dist');
if (!fs.existsSync(distDir)) {
  fail('dist/ 目录不存在，打包可能未输出到正确位置');
  process.exit(1);
}
const distFiles = fs.readdirSync(distDir);
ok(`dist/ 产物: ${distFiles.join(', ')}`);

// ─── Step 5 & 6: 推送到 release 分支 ─────────────────────────────────────────
title('Step 5  创建并推送 release 分支');

// 记录当前所在分支，操作结束后回来
let originalBranch;
try {
  originalBranch = run('git rev-parse --abbrev-ref HEAD', { silent: true });
} catch (_) {
  originalBranch = 'main';
}

// 检查工作区是否干净（只检查 non-dist 改动）
try {
  const status = run('git status --porcelain', { silent: true });
  if (status) {
    warn('工作区有未提交改动，发布产物时将不影响 main 分支');
  }
} catch (_) { /* 无法读取工作区状态，忽略 */ }

// 使用临时目录来存放产物并创建孤立分支（tmpDir 已在顶部声明）
try {
  // 清理旧的临时目录
  if (fs.existsSync(tmpDir)) {
    run(`rm -rf "${tmpDir}"`, { silent: true });
  }

  // 创建临时工作区
  log('初始化临时发布工作区...');
  fs.mkdirSync(tmpDir, { recursive: true });

  // 在临时目录里用 worktree 方式操作（避免污染主工作区）
  // 先删除已有同名 worktree（如果有遗留）
  try {
    run(`git worktree remove --force "${tmpDir}"`, { silent: true });
  } catch (_) { /* ignore existing worktree records */ }

  // 创建孤立分支并 checkout 到 worktree
  log(`创建孤立分支 ${releaseBranch}...`);

  // 检查本地是否有同名分支（遗留）
  try {
    const localBranches = run('git branch', { silent: true });
    if (localBranches.split('\n').some(b => b.trim() === releaseBranch || b.trim() === `* ${releaseBranch}`)) {
      run(`git branch -D "${releaseBranch}"`, { silent: true });
      log(`已删除旧的本地分支 ${releaseBranch}`);
    }
  } catch (_) { /* ignore if branch listing fails */ }

  // 添加 worktree（孤立分支）
  run(`git worktree add --orphan -b "${releaseBranch}" "${tmpDir}"`, { silent: false });

  // 复制 dist 内容到 worktree
  log('复制产物到发布分支...');
  const files = fs.readdirSync(distDir);
  for (const file of files) {
    const src = path.join(distDir, file);
    const dst = path.join(tmpDir, file);
    run(`cp -r "${src}" "${dst}"`, { silent: true });
  }

  // 复制 CNAME 文件（如有）
  const cnameFiles = ['CNAME', 'www.CNAME'];
  for (const cf of cnameFiles) {
    const src = path.join(ROOT, cf);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(tmpDir, cf));
      log(`已复制 ${cf}`);
    }
  }

  // 写入版本信息文件
  const releaseInfo = {
    version: newVersion,
    branch: releaseBranch,
    builtAt: new Date().toISOString(),
    builtFrom: originalBranch,
    commit: (() => { try { return run('git rev-parse --short HEAD', { silent: true }); } catch (_) { return 'unknown'; } })(),
  };
  fs.writeFileSync(
    path.join(tmpDir, 'release.json'),
    JSON.stringify(releaseInfo, null, 2) + '\n',
    'utf8'
  );
  ok('写入 release.json');

  // 在 worktree 中提交
  log('提交发布产物...');
  run('git add -A', { cwd: tmpDir, silent: false });

  const commitMsg = `release: v${newVersion}\n\n- 构建时间: ${releaseInfo.builtAt}\n- 来源分支: ${originalBranch}\n- 来源 commit: ${releaseInfo.commit}`;
  run(`git commit -m "${commitMsg.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"`, { cwd: tmpDir, silent: false });
  ok('产物提交完成');

  // 推送到远端
  log(`推送 ${releaseBranch} 到远端...`);
  run(`git push origin "${releaseBranch}"`, { cwd: tmpDir, silent: false });
  ok(`已推送到 origin/${releaseBranch}`);

} catch (e) {
  fail('发布过程出错', e);
  cleanupWorktree();
  process.exit(1);
} finally {
  // 清理 worktree（无论成败均执行）
  cleanupWorktree();
  ok('临时 worktree 已清理');
}

// ─── 完成摘要 ─────────────────────────────────────────────────────────────────
title('发布完成');
console.log(`
  ${c.bold}${c.green}🎉 发布成功！${c.reset}

  版本:    ${c.bold}v${currentVersion}  →  v${newVersion}${c.reset}
  分支:    ${c.cyan}${releaseBranch}${c.reset}
  远端:    origin/${releaseBranch}

  ${c.gray}查看发布分支:${c.reset}
    git fetch origin
    git log origin/${releaseBranch} --oneline
`);
