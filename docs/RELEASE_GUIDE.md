# 发布脚本说明（release.js）

> 最后更新：2026-03-14

## 概述

`scripts/release.js` 是项目的一键发布脚本，负责：

1. 自动递增语义版本号
2. 执行 lint 检查
3. 从飞书拉取最新产品数据（可跳过）
4. 执行多语言翻译（可跳过）
5. webpack 打包 + 静态验证
6. 将产物推送到独立的 `release/vX.Y.Z` 孤立分支

发布分支**只含产物**（`dist/` 内容 + `CNAME` + `release.json`），不含源码，可直接用于静态服务器部署或 CI/CD 拉取。

---

## 快速开始

```bash
# 正式发版（完整流程：飞书 + 增量翻译 + 打包推送）
npm run release

# 仅前端改动（跳过飞书和翻译，最快）
npm run release:pack-only

# 预演：查看将执行的步骤，不实际操作
npm run release:dry
```

---

## 所有参数

### 版本号控制

| 参数 | 说明 | 示例 |
|------|------|------|
| 无参数 | **patch** 递增（默认）| `1.2.3` → `1.2.4` |
| `--minor` | minor 递增，patch 归零 | `1.2.3` → `1.3.0` |
| `--major` | major 递增，minor/patch 归零 | `1.2.3` → `2.0.0` |
| `--version=X.Y.Z` | 指定版本号（跳过自动递增）| `--version=2.0.0` |

### 跳过/控制构建步骤

| 参数 | 别名 | 说明 |
|------|------|------|
| `--skip-feishu` | `--no-feishu` | 跳过飞书数据拉取（Step 4） |
| `--skip-translate` | `--no-translate` | 跳过多语言翻译（Step 5） |
| `--full-translate` | — | 全量翻译（默认为增量翻译） |
| `--skip-build` | — | 跳过全部构建步骤，直接用已有 `dist/` |
| `--skip-lint` | — | 跳过 lint 检查 |

### 调试

| 参数 | 说明 |
|------|------|
| `--dry-run` | 预演模式：只打印计划，不执行任何操作，不写文件 |

---

## npm scripts 快捷命令

| 命令 | 等效参数 | 适用场景 |
|------|---------|---------|
| `npm run release` | — | 正式发版（完整流程） |
| `npm run release:minor` | `--minor` | feature 版本发布 |
| `npm run release:major` | `--major` | 重大版本发布 |
| `npm run release:dry` | `--dry-run` | 预演确认流程 |
| `npm run release:no-translate` | `--skip-translate` | 有数据更新，无需重新翻译 |
| `npm run release:no-feishu` | `--skip-feishu` | 本地数据已最新，跳过飞书 |
| `npm run release:pack-only` | `--skip-feishu --skip-translate` | 纯前端改动，最快发布 |
| `npm run release:full-translate` | `--full-translate` | 翻译大幅更新，全量重译 |

---

## 发布流程详解

```
Step 1  读取远端 release 版本
        └─ git fetch --prune origin
        └─ 解析所有 release/vX.Y.Z 分支，取最大版本号

Step 2  计算新版本号
        └─ 根据 --major / --minor / --version 或默认 patch 递增
        └─ 同步写入 package.json（非 dry-run 时）

Step 3  Lint 检查
        └─ npm run lint:all（ESLint + Stylelint）
        └─ --skip-lint 可跳过

Step 4  飞书数据同步                    ← --skip-feishu 跳过
        ├─ ensure-product-data-table.js   拉取飞书产品数据表
        ├─ npm run i18n:extract           提取 i18n key
        ├─ npm run product:sync:source    同步中文源文件
        └─ npm run merge:i18n             合并翻译文件

Step 5  多语言翻译                      ← --skip-translate 跳过
        ├─ npm run translate:products:incremental  增量翻译（默认）
        │  或 npm run translate:products            全量翻译（--full-translate）
        ├─ npm run product:sync           写入所有语言文件
        └─ npm run product:collect        收集语言包

Step 6  打包构建                        ← --skip-build 跳过
        └─ npm run build:static
           ├─ npm run split:lang          按语言拆分翻译
           ├─ webpack --mode=production   打包 JS/CSS
           ├─ copy-translations.js        复制语言文件到 dist/
           ├─ build-i18n.js              生成单语言文件
           └─ verify-static-build.js     验证产物完整性

Step 7  创建并推送 release 分支
        ├─ git worktree add --orphan -b release/vX.Y.Z .release-tmp/
        ├─ 复制 dist/ 内容
        ├─ 复制 CNAME / www.CNAME（如存在）
        ├─ 写入 release.json（版本、构建时间、来源 commit）
        ├─ git commit -m "release: vX.Y.Z"
        └─ git push origin release/vX.Y.Z
```

---

## 四种构建模式对比

| 模式 | 命令 | 飞书 | 翻译 | 打包 | 耗时参考 |
|------|------|:----:|:----:|:----:|---------|
| 完整发版 | `npm run release` | ✅ | ✅ 增量 | ✅ | 5~15 分钟 |
| 全量翻译 | `npm run release:full-translate` | ✅ | ✅ 全量 | ✅ | 10~30 分钟 |
| 跳过翻译 | `npm run release:no-translate` | ✅ | ❌ | ✅ | 2~5 分钟 |
| 跳过飞书 | `npm run release:no-feishu` | ❌ | ✅ 增量 | ✅ | 3~10 分钟 |
| 仅打包 | `npm run release:pack-only` | ❌ | ❌ | ✅ | ~1 分钟 |

> **耗时**受飞书 API 响应速度、翻译 API 速度、产品数量影响。

---

## release 分支结构

发布完成后，`release/vX.Y.Z` 分支仅包含以下文件：

```
release/v1.2.3/
├── index.html                    # 主页面
├── bundle.[contenthash:8].js     # JS（含版本 hash）
├── styles.[contenthash:8].css    # CSS（含版本 hash）
├── sw.js                         # Service Worker
├── CNAME                         # 自定义域名
├── release.json                  # 版本元信息
└── assets/
    └── lang/                     # 42 个翻译文件（21 语言 × 2 格式）
```

`release.json` 内容示例：

```json
{
  "version": "1.2.3",
  "branch": "release/v1.2.3",
  "builtAt": "2026-03-14T10:30:00.000Z",
  "builtFrom": "main",
  "commit": "a3f2e1b"
}
```

---

## 使用场景指南

### 场景 1：日常前端迭代（改 CSS / 组件逻辑）

产品数据和翻译文案没变，直接仅打包：

```bash
npm run release:pack-only
```

### 场景 2：飞书表格新增/修改了产品

需要拉取最新数据，但翻译文案改动不大，使用现有翻译：

```bash
npm run release:no-translate
```

### 场景 3：正式生产发版

完整流程，拉最新数据 + 增量翻译只处理新增/变更内容：

```bash
npm run release
```

### 场景 4：产品文案大幅重写

所有翻译都需要重新生成：

```bash
npm run release:full-translate
```

### 场景 5：发布 minor / major 版本

```bash
npm run release:minor          # 1.2.3 → 1.3.0
npm run release:major          # 1.2.3 → 2.0.0
```

### 场景 6：先预演确认，再执行

```bash
# 查看会跑哪些步骤
npm run release:dry

# 确认后执行
npm run release
```

### 场景 7：跳过 lint（紧急修复）

```bash
node scripts/release.js --skip-lint --skip-translate
```

---

## 中断与异常处理

- 脚本监听 `SIGINT`（Ctrl+C）和 `SIGTERM` 信号，中断时自动清理临时 worktree
- 任何步骤失败都会 `process.exit(1)` 并清理临时目录
- 中断后若仍有残留，手动清理：

```bash
git worktree remove --force .release-tmp
rm -rf .release-tmp
```

---

## 常见问题

### Q: `远端分支 release/vX.Y.Z 已存在` 报错
**A**: 该版本已发布过，使用 `--version` 指定更高版本：
```bash
node scripts/release.js --version=1.2.5
```

### Q: 飞书同步报错怎么办？
**A**:
1. 检查 `scripts/feishu-config.json` 中的 `appId` 和 `appSecret`
2. 确认网络能访问飞书 API（`open.feishu.cn`）
3. 临时跳过飞书步骤：`npm run release:no-feishu`

### Q: 翻译步骤卡住或报错
**A**:
1. 检查翻译 API 密钥配置
2. 增量翻译只处理变更内容，通常比全量快很多
3. 临时跳过翻译：`npm run release:no-translate`

### Q: 发布后如何查看分支内容？
**A**:
```bash
git fetch origin
git log origin/release/v1.2.3 --oneline
git show origin/release/v1.2.3:release.json
```

### Q: package.json 的 version 会自动更新吗？
**A**: 会。非 dry-run 模式下，`package.json` 的 `version` 字段会在 Step 2 自动同步为新版本号，并包含在下一次 `main` 分支的 commit 里。

---

## 相关文档

- [BUILD_WORKFLOW.md](./BUILD_WORKFLOW.md) — 所有构建命令详解
- [STATIC_DEPLOYMENT.md](./STATIC_DEPLOYMENT.md) — 静态服务器部署配置
- [TRANSLATION_INTEGRATION_GUIDE.md](./TRANSLATION_INTEGRATION_GUIDE.md) — 翻译系统集成
