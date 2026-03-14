# 构建流程说明

> 最后更新：2026-03-14

## 概述

本项目提供了多种构建模式，以满足不同场景的需求：

| 场景 | 推荐命令 | 说明 |
|------|---------|------|
| 日常开发 | `npm start` | webpack-dev-server，热更新 |
| 纯前端改动发布 | `npm run release:pack-only` | 跳过飞书和翻译，最快 |
| 有产品数据更新 | `npm run release:no-translate` | 飞书拉取，跳过翻译 |
| 正式生产发版 | `npm run release` | 完整：飞书 → 增量翻译 → 打包推送 |
| 翻译大幅更新 | `npm run release:full-translate` | 飞书 → 全量翻译 → 打包推送 |

---

## 一、npm 构建命令

### 开发环境

#### `npm start` / `npm run startAll`
启动 webpack-dev-server（development 模式），带热模块替换（HMR）。

- ✅ 启动快（不访问飞书）
- ✅ 使用现有产品数据表
- ✅ 代码实时编译

#### `npm run dev`
用 nodemon 启动 Express 静态服务器（`server.js`），适合测试 dist/ 产物行为。

#### `npm run dev:webpack`
启动开发服务器前先从飞书拉一次最新数据。

- ✅ 数据最新
- ❌ 启动较慢（受网络影响）

---

### 生产构建

所有生产构建均输出到 `dist/` 目录。

#### `npm run build`
最基础的生产构建，不含飞书和翻译。

```
split:lang → webpack(production) → copy-translations → build-i18n
```

#### `npm run build:static`
在 `build` 基础上增加静态部署验证（`verify-static-build.js`）。

```
split:lang → webpack → copy-translations → build-i18n → verify
```

> **release.js 的打包步骤就调用这条命令。**

#### `npm run build:withFeishu`
包含飞书数据拉取和增量翻译的完整构建（不含 verify）。

```
ensure-product-data-table（飞书）
→ i18n:extract → product:sync:source → merge:i18n
→ translate:products:incremental（增量翻译）
→ product:sync → product:collect
→ split:lang → webpack → copy-translations → build-i18n
```

#### `npm run build:static:withFeishu`
同上，增加 `verify-static-build.js`。

#### `npm run build:production`
完整生产流程，增量翻译 + verify，**等效于 `npm run release` 的内部逻辑**。

#### `npm run build:production:full`
同上，但使用**全量翻译**（非增量）。适合翻译文案大幅更新时。

---

## 二、打包产物说明

### dist/ 目录结构

```
dist/
├── index.html                    # 主页面（由 HtmlWebpackPlugin 生成）
├── bundle.[contenthash:8].js     # JS 产物（生产环境含 contenthash）
├── styles.[contenthash:8].css    # CSS 产物
├── sw.js                         # Service Worker
├── release.json                  # 版本信息（由 release.js 写入）
├── CNAME                         # 自定义域名（由 release.js 复制）
└── assets/
    ├── lang/                     # 按语言拆分的翻译文件
    │   ├── zh-CN-ui.json         # 中文 UI 翻译
    │   ├── zh-CN-product.json    # 中文产品翻译
    │   ├── en-ui.json
    │   ├── en-product.json
    │   └── ... (21 种语言 × 2 格式 = 42 个文件)
    └── images/                   # 图片资源
```

### bundle 文件名含 contenthash

生产环境下，`bundle.js` 和 `styles.css` 文件名都包含 8 位内容哈希：

```
bundle.3f2a1b4c.js
styles.7e9d0a2f.css
```

**作用**：每次内容变化文件名随之改变，浏览器自动放弃缓存，不需要手动刷新。

### publicPath = `/`

webpack 配置的 `publicPath` 固定为 `/`，所有资源以根路径引用。适合：

- Nginx / Apache 根目录部署
- Docker 容器
- GitHub Pages（域名根路径）

> 如需子目录部署（如 `/app/`），需同步修改 `webpack.config.js` 中的 `publicPath`。

---

## 三、i18n 翻译流程

翻译流程由以下脚本组成，可单独调用也可作为构建链的一部分：

```
ensure-product-data-table.js    # 从飞书拉取产品数据表
  └─ product-i18n-adapter.js    # 提取产品 i18n key（--generate 模式）
      └─ product-sync-i18n.js   # 同步中文源（--source-only 模式）
          └─ merge-translations.js        # 合并 UI + 产品翻译
              └─ product-translate-adapter.js  # 调用翻译 API
                  └─ product-sync-i18n.js      # 写入所有语言文件
                      └─ split-by-language.js  # 按语言分割（--collect 模式）
```

| 命令 | 说明 |
|------|------|
| `npm run sync:feishu` | 只拉飞书数据，不翻译 |
| `npm run translate:products:incremental` | 只翻译新增/变更的 key |
| `npm run translate:products` | 全量重新翻译所有 key |
| `npm run i18n:extract` | 提取 i18n key |
| `npm run merge:i18n` | 合并翻译文件 |

---

## 四、Service Worker

- SW 文件 `sw.js` 由 `CopyWebpackPlugin` 从 `src/sw.js` 原样复制到 `dist/`
- `init.js` 中注册路径为相对路径 `./sw.js`，适配子目录部署
- SW 会缓存语言文件，`fetch` 拦截兼容 `/assets/lang/` 和相对路径两种形式

---

## 五、常见问题

### Q: bundle.js 文件名变了，旧缓存会有问题吗？
**A**: 不会。contenthash 机制确保文件名随内容变化，HTML 里的引用是 webpack 自动注入的最新文件名。浏览器对旧文件名的请求自然会 404（返回 index.html），新文件名则会正常加载。

### Q: 什么时候用 `--skip-translate`（跳过翻译）？
**A**: 改了前端代码但产品文案没变时。翻译步骤只处理产品数据，UI 变更不需要重新翻译。

### Q: 构建失败怎么排查？
**A**:
1. 检查 `scripts/feishu-config.json` 中的 App ID 和 Secret
2. 检查网络连接（飞书 API 需要访问外网）
3. 检查翻译 API 密钥（如果使用翻译步骤）
4. 单独运行各步骤定位问题：`npm run sync:feishu`、`npm run translate:products:incremental`
5. 使用 `--skip-feishu --skip-translate` 先验证 webpack 打包是否正常

### Q: 如何测试新的产品数据不发版？
**A**:
```bash
npm run sync:feishu          # 更新数据
npm start                    # 本地预览
```

---

## 六、相关文档

- [RELEASE_GUIDE.md](./RELEASE_GUIDE.md) — `release.js` 发布脚本详细说明
- [STATIC_DEPLOYMENT.md](./STATIC_DEPLOYMENT.md) — 静态部署服务器配置
- [TRANSLATION_INTEGRATION_GUIDE.md](./TRANSLATION_INTEGRATION_GUIDE.md) — 翻译系统集成
- [I18N_WORKFLOW_ANALYSIS.md](./I18N_WORKFLOW_ANALYSIS.md) — i18n 工作流分析
