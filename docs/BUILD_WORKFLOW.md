# 构建流程说明

## 概述

本项目提供了多种构建模式，以满足不同场景的需求：

- **快速构建**（默认）：不涉及飞书数据获取和多语言翻译，适合日常开发和调试
- **完整构建**：从飞书获取最新数据并执行多语言翻译，适合生产发布

---

## 构建命令详解

### 开发环境

#### `npm start` 或 `npm startAll`
**用途**：快速启动开发服务器（webpack-dev-server）

**特点**：
- ✅ 启动快速（无需飞书数据获取）
- ✅ 使用现有的产品数据表
- ✅ 热模块替换（HMR）支持
- ✅ 适合日常开发和调试

**工作流程**：
```
1. 启动 webpack-dev-server (development 模式)
2. 加载现有的 src/assets/product-data-table.js
3. 实时编译和热更新
```

#### `npm run dev:fast`
**用途**：快速启动开发服务器（与 `npm start` 相同）

#### `npm run dev:webpack`
**用途**：启动开发服务器 + 从飞书获取数据

**特点**：
- ✅ 获取最新的飞书数据
- ❌ 启动较慢（需要网络请求）
- ⚠️ 适用于需要最新产品数据的场景

---

### 生产环境

#### `npm run build`
**用途**：快速生产构建（不涉及飞书和翻译）

**特点**：
- ✅ 构建快速（无需飞书数据获取和翻译）
- ✅ 使用现有的产品数据表和翻译文件
- ✅ 代码压缩和优化
- ✅ 适合常规发布

**工作流程**：
```
1. Webpack 打包 (production 模式)
   - 压缩和优化 JavaScript
   - 提取和压缩 CSS
   - 复制语言文件到 dist/assets/lang/
2. 运行 copy-i18n.js
   - 复制 i18n.json 到 dist/
```

#### `npm run build:static`
**用途**：快速静态部署构建

**特点**：
- ✅ 构建快速（不涉及飞书和翻译）
- ✅ 包含静态部署验证
- ✅ 适合静态服务器部署

**工作流程**：
```
1. 执行 npm run build
2. 运行 verify-static-build.js
   - 验证所有必需文件存在
   - 检查语言文件完整性
   - 验证 Service Worker 配置
```

#### `npm run build:with-feishu`
**用途**：完整生产构建（包含飞书数据获取和翻译）

**特点**：
- ✅ 获取最新的飞书数据
- ✅ 执行完整的多语言翻译流程
- ✅ 代码压缩和优化
- ❌ 构建时间较长（取决于网络和翻译 API）
- ⚠️ 适用于生产发布

**工作流程**：
```
1. 从飞书获取数据
   - 运行 ensure-product-data-table.js
   - 下载并解析飞书表格数据
   - 生成 product-data-table.js

2. 提取 i18n
   - 运行 product-i18n-adapter.js --generate
   - 提取所有产品的多语言字段
   - 生成 producti18n.json

3. 同步源文件
   - 运行 product-sync-i18n.js --source-only
   - 同步 zh-CN.json 和 producti18n.json
   - 补全缺失的产品 key

4. 合并翻译
   - 运行 merge-translations.js
   - 合并 UI 和产品翻译
   - 清理重复的 hex ID key

5. 翻译产品
   - 运行 product-translate-adapter.js
   - 使用 Gemini 3 API 翻译所有产品
   - 生成所有 21 种语言的翻译

6. 同步所有语言
   - 运行 product-sync-i18n.js
   - 将翻译同步到所有语言文件
   - 补全缺失的 key

7. Webpack 打包
   - 压缩和优化代码
   - 复制语言文件到 dist/

8. 复制 i18n
   - 运行 copy-i18n.js
   - 复制 i18n.json 到 dist/
```

#### `npm run build:static:with-feishu`
**用途**：完整静态部署构建（包含飞书数据获取和翻译）

**特点**：
- ✅ 完整的构建流程
- ✅ 包含静态部署验证
- ✅ 适合生产静态部署
- ❌ 构建时间最长

**工作流程**：
```
1. 执行完整的 build:with-feishu 流程
2. 运行 verify-static-build.js
   - 验证所有必需文件存在
   - 检查语言文件完整性
   - 验证 Service Worker 配置
```

---

## 构建时间对比

| 命令 | 构建时间 | 适用场景 |
|-------|---------|---------|
| `npm start` | ~5秒 | 日常开发 |
| `npm run build` | ~10秒 | 常规发布 |
| `npm run build:static` | ~12秒 | 静态部署 |
| `npm run build:with-feishu` | ~5-10分钟 | 生产发布（含翻译） |
| `npm run build:static:with-feishu` | ~5-10分钟 | 静态部署（含翻译） |

**注**：`build:with-feishu` 的构建时间取决于：
- 飞书 API 响应速度
- Gemini 翻译 API 响应速度
- 网络连接质量
- 产品数量和翻译文本量

---

## 推荐使用场景

### 日常开发
```bash
npm start
```
- 最快启动速度
- 使用现有数据
- 适合 UI 开发和调试

### 功能开发
```bash
npm run dev:fast
```
- 与 `npm start` 相同
- 提供清晰的命令命名

### 数据更新（测试）
```bash
npm run sync:feishu
npm start
```
- 单独更新数据
- 验证数据是否正确

### 常规发布
```bash
npm run build
# 部署 dist/ 目录
```
- 快速构建
- 使用现有翻译

### 生产发布（完整）
```bash
npm run build:with-feishu
# 部署 dist/ 目录
```
- 最新产品数据
- 最新翻译
- 完整验证

### 静态部署
```bash
npm run build:static
# 部署 dist/ 目录到静态服务器
```
- 快速静态构建
- 验证静态部署配置

### 静态部署（完整）
```bash
npm run build:static:with-feishu
# 部署 dist/ 目录到静态服务器
```
- 完整静态构建
- 最新数据和翻译

---

## 常见问题

### Q: 为什么默认构建不包含飞书数据？
**A**: 为了提高开发效率。飞书数据获取和翻译需要较长时间，日常开发使用现有数据即可，避免不必要的等待。

### Q: 什么时候需要使用 `build:with-feishu`？
**A**:
- 发布生产版本时
- 飞书表格有重大更新时
- 需要更新产品数据时
- 需要重新翻译时

### Q: 如何测试新的产品数据？
**A**:
```bash
# 1. 更新产品数据
npm run sync:feishu

# 2. 查看更新的数据
cat src/assets/product-data-table.js

# 3. 启动开发服务器测试
npm start
```

### Q: 构建失败怎么办？
**A**:
1. 检查飞书配置（`scripts/feishu-config.json`）
2. 检查网络连接
3. 检查 Gemini API 密钥（如果使用翻译）
4. 查看构建日志中的错误信息
5. 尝试单独运行各个步骤进行调试

### Q: 如何跳过翻译？
**A**: 使用快速构建命令：
```bash
npm run build
```

---

## 文件结构

### 构建前
```
src/
├── assets/
│   ├── lang/          # 21 个语言文件
│   ├── product-data-table.js
│   └── ...
└── ...
```

### 构建后
```
dist/
├── assets/
│   └── lang/         # 21 个语言文件（复制）
├── i18n.json         # 完整 i18n（复制）
├── bundle.js         # 打包后的 JS
├── styles.*.css      # 提取的 CSS
├── index.html        # HTML 文件
└── sw.js            # Service Worker
```

---

## 环境变量

本项目不依赖环境变量，所有配置通过以下方式管理：

- `scripts/feishu-config.json` - 飞书 API 配置
- `config.js` - 应用配置
- `.env` 文件（如果需要）- 环境特定配置

---

## 相关脚本说明

### 核心脚本
- `ensure-product-data-table.js` - 确保产品数据表存在
- `product-i18n-adapter.js` - 提取产品 i18n
- `product-sync-i18n.js` - 同步产品 i18n
- `product-translate-adapter.js` - 翻译产品
- `merge-translations.js` - 合并翻译

### 辅助脚本
- `copy-i18n.js` - 复制 i18n.json
- `copy-translations.js` - 复制语言文件
- `verify-static-build.js` - 验证静态构建
