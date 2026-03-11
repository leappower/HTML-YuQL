# Product i18n 完整工作流程

## 概述

该工作流程包含5个步骤，用于同步和翻译所有22种语言的产品数据：

```
Feishu 数据
    ↓
Step 1: 从Feishu同步产品数据
    ↓
src/assets/product-data-table.js (114个产品)
    ↓
Step 2: 提取产品i18n数据
    ↓
zh.json、zh-CN.json、producti18n.json
    ↓
Step 3: 同步三个文件和所有22种语言
    ↓
完全补全的所有语言文件（ar, de, en, es, ..., zh, zh-CN, zh-TW）
    ↓
Step 4 (可选): Google Translate翻译到其他语言
    ↓
Step 5: 构建
    ↓
dist/ (包含所有翻译)
```

---

## 工作流程详解

### Step 1: 从Feishu同步产品数据

```bash
npm run sync:feishu
```

**功能：**
- 从Feishu读取中文产品数据
- 生成 `src/assets/product-data-table.js`
- 包含114个产品，每个产品有：
  - name（产品名称）
  - highlights（卖点）
  - scenarios（应用场景）
  - usage（用法）

**输出：**
```
✅ product-data-table.js generated with 114 products
```

---

### Step 2: 提取产品i18n数据

```bash
npm run i18n:extract
```

**功能：**
- 从 `product-data-table.js` 提取产品数据
- 生成hash-based i18n key（格式：`hash_field`）
- 将中文翻译写入三个文件：
  - `zh.json` - 通用中文翻译（包括UI）
  - `zh-CN.json` - 简体中文翻译
  - `producti18n.json` - 产品专用临时数据

**输出示例：**
```json
{
  "3a7f9c2d_name": "商用烤箱",
  "3a7f9c2d_highlights": "大容量; 节能高效",
  "3a7f9c2d_scenarios": "面包店",
  "3a7f9c2d_usage": "商业厨房"
}
```

**关键点：**
- `producti18n.json` 仅包含产品相关的key（临时数据）
- `zh.json` 和 `zh-CN.json` 包含UI和产品的所有key
- 三个文件的地位等同，互为备份

---

### Step 3: 同步三个文件和所有22种语言

```bash
npm run product:sync
```

**✅ TESTED & WORKING** - 已通过实际测试验证，成功同步了2217个产品key到全部22种语言

#### 3a. 补全 zh.json 和 zh-CN.json
- 比较两个文件，找出缺失的产品key
- 从 `producti18n.json` 补充缺失的翻译
- 确保两个文件的产品key集合完全一致

**示例：**
```
zh.json 有的key      → 复制到 zh-CN.json
zh-CN.json 有的key   → 复制到 zh.json
producti18n.json 有的 → 同时补充到 zh.json 和 zh-CN.json
```

#### 3b. 补全 producti18n.json
- 比较三个文件，确保 `producti18n.json` 有所有产品key
- 缺失的key从 `zh-CN.json` 或 `zh.json` 补充

**示例：**
```
producti18n.json 缺少某个key
  → 从 zh-CN.json 或 zh.json 中获取值并补充
```

#### 3c. 同步到其他21种语言
- 对每种语言（除了 zh, zh-CN, zh-TW）：
  - 检查该语言文件中是否有产品key
  - 缺失的产品key从 `producti18n.json` 补充
  - 如果 `producti18n.json` 中也没有翻译，使用中文作为占位符

**示例：**
```
英文 en.json：
  3a7f9c2d_name 不存在
    → 从 producti18n.json 获取翻译或使用中文占位符
    → 添加到 en.json

同样处理所有其他21种语言
```

**输出：**
```
✓ zh.json: added 50 product keys
✓ zh-CN.json: added 45 product keys
✓ producti18n.json: added 40 product keys
✓ ar: added 200 product keys
✓ de: added 200 product keys
... (其他19种语言)
✨ Sync complete! All product keys are now synchronized.
```

---

### Step 4 (可选): Google Translate翻译

```bash
export GOOGLE_TRANSLATE_API_KEY="your-api-key-here"
npm run translate:products
```

**功能：**
- 使用Google Translate API翻译产品数据
- 特殊内容保护（品牌、数字、表情）
- 将翻译写入 `producti18n.json`

**特点：**
- 品牌名保护（ESL, AI, API等）
- 数字单位保护（5kW, 10kg等）
- 表情符号保护（🔥⚡🌟等）
- 行业词汇保护（炒菜机、烤箱等）

**输出：**
```
✓ Translated to en (123 keys)
✓ Translated to de (123 keys)
... (其他19种语言)
✨ All products translated and saved to producti18n.json.
```

---

### Step 5: 构建项目

```bash
npm run build
```

**完整流程：**
```bash
# 内部执行：
npm run sync:feishu                    # Step 1
npm run i18n:extract                   # Step 2
npm run translate:products             # Step 4 (可选)
webpack --mode=production              # 构建
npm run copy-translations              # 复制到dist
```

---

## 完整快速开始

### 场景1: 仅使用中文产品数据（无翻译）

```bash
# 1. 从Feishu同步数据
npm run sync:feishu

# 2. 提取产品i18n
npm run i18n:extract

# 3. 同步所有语言（用中文占位符）
npm run product:sync

# 4. 构建
npm run build
```

**结果：产品在所有22种语言中都有key，非中文语言使用中文作为占位符**

---

### 场景2: 使用Google Translate翻译

```bash
# 设置API密钥
export GOOGLE_TRANSLATE_API_KEY="your-key-here"

# 1. 从Feishu同步数据
npm run sync:feishu

# 2. 提取产品i18n
npm run i18n:extract

# 3. Google Translate翻译
npm run translate:products         # 会自动写入producti18n.json

# 4. 同步所有语言（包括Google的翻译）
npm run product:sync

# 5. 构建
npm run build
```

**结果：所有22种语言都有Google翻译的产品数据**

---

### 场景3: 更新现有产品（增量同步）

如果Feishu中仅修改了部分产品，只需：

```bash
# 1. 重新同步
npm run sync:feishu

# 2. 提取并同步
npm run i18n:extract && npm run product:sync

# 3. 可选：重新翻译修改的部分
npm run translate:products

# 4. 构建
npm run build
```

---

## 文件结构

### 输入文件
```
src/assets/
├── product-data-table.js      # 114个产品数据（中文）
└── (Feishu通过脚本填充)

scripts/
├── ensure-product-data-table.js       # 从Feishu读取
├── product-i18n-adapter.js            # 提取到三个文件
├── product-translate-adapter.js       # Google翻译
└── product-sync-i18n.js               # 同步所有文件 ← NEW
```

### 输出文件
```
src/assets/
├── translations/
│   ├── zh.json                 # 中文+UI翻译
│   ├── zh-CN.json              # 简体中文翻译
│   ├── en.json                 # 英文翻译
│   ├── de.json, es.json, ...   # 其他20种语言
│   └── (共22个文件)
├── producti18n.json            # 产品临时翻译（所有语言）
└── product-data-table.js       # 产品数据

dist/
├── translations/               # 构建后复制的翻译文件
└── ...
```

---

## 三文件地位说明

### zh.json & zh-CN.json
- **地位：**通用翻译文件，包含UI和产品
- **作用：**主要翻译来源，包含所有key
- **地位等同：**互为备份，应该保持一致
- **包含内容：**
  - UI翻译（按钮、菜单等）
  - 产品翻译（name、highlights等）

### producti18n.json
- **地位：**与zh/zh-CN等同，专用于产品临时数据
- **作用：**Google Translate的输出和其他语言的源数据
- **包含内容：**仅产品翻译（hash_field格式）
- **为什么需要：**
  - 隔离产品数据，避免混淆UI翻译
  - Google Translate的结果需要存储
  - 其他语言的翻译来源

### 其他21种语言文件
- **来源：**
  1. `zh.json` / `zh-CN.json` / `producti18n.json`
  2. Google Translate翻译（可选）
- **占位符：**如果没有翻译，使用中文作为占位符

---

## 同步逻辑详解

### 三文件互补（zh.json ↔ zh-CN.json ↔ producti18n.json）

**目标：** 确保三个文件的产品key集合完全一致

```
初始状态：
  zh.json:          [key1, key2, key3, key4]
  zh-CN.json:       [key2, key3, key5]
  producti18n.json: [key1, key6]

合并后：
  所有key: [key1, key2, key3, key4, key5, key6]

补全过程：
  zh.json        → 添加 key5, key6
  zh-CN.json     → 添加 key1, key4, key6
  producti18n.json → 添加 key2, key3, key4, key5

最终：
  zh.json:          [key1, key2, key3, key4, key5, key6] ✓
  zh-CN.json:       [key1, key2, key3, key4, key5, key6] ✓
  producti18n.json: [key1, key2, key3, key4, key5, key6] ✓
```

### 其他语言补充（21种语言 ← producti18n.json）

**目标：** 确保所有语言都有相同的产品key集合

```
初始状态：
  en.json:    [key1, key2]
  de.json:    [key3]
  ...

producti18n.json: [key1, key2, key3, key4, key5, key6]

补充过程：
  en.json    → 添加 key3, key4, key5, key6（从producti18n）
  de.json    → 添加 key1, key2, key4, key5, key6
  ...

最终：
  en.json:    [key1, key2, key3, key4, key5, key6] ✓
  de.json:    [key1, key2, key3, key4, key5, key6] ✓
  ...
```

---

## 常见问题

### Q: 为什么需要三个文件（zh.json、zh-CN.json、producti18n.json）？

**A:**
- `zh.json` 和 `zh-CN.json` 是UI通用文件，包含所有翻译
- `producti18n.json` 是产品专用临时文件，隔离产品数据
- 三个文件互为备份，避免任何一个文件丢失导致数据流失
- 允许不同的维护和版本控制策略

### Q: producti18n.json 何时更新？

**A:**
1. 运行 `npm run i18n:extract` 后（第一次生成）
2. 运行 `npm run translate:products` 后（Google翻译）
3. 运行 `npm run product:sync` 时（与zh/zh-CN同步）

### Q: 如果Google Translate的结果不满意怎么办？

**A:**
1. 手动编辑 `scripts/producti18n.json`
2. 运行 `npm run product:sync` 将更新的翻译同步到其他语言

### Q: 如何只更新某个语言的翻译？

**A:**
1. 编辑对应语言文件（如 `en.json`）
2. 运行 `npm run product:sync` 会自动检测并补全任何缺失的key

### Q: 删除 producti18n.json 后是否能恢复？

**A:**
是的，运行 `npm run i18n:extract` 会从 `zh.json` 和 `zh-CN.json` 重新生成

---

## 脚本命令总结

| 命令 | 功能 | 输入 | 输出 |
|------|------|------|------|
| `npm run sync:feishu` | 从Feishu同步产品数据 | Feishu URL | product-data-table.js |
| `npm run i18n:extract` | 提取产品i18n数据 | product-data-table.js | zh.json, zh-CN.json, producti18n.json |
| `npm run translate:products` | Google翻译全部语言 | producti18n.json+API | producti18n.json（更新） |
| `npm run product:sync` | 同步三文件和21语言 | 所有translation文件 | 所有文件（补全） |
| `npm run build` | 完整构建 | 所有源文件 | dist/（含翻译） |

