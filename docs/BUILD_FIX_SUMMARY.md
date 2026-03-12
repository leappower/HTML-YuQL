# 构建流程修复总结

## 问题描述

运行 `npm run build:withFeishu` 时遇到以下错误：

```
Extracting i18n data from products to producti18n.json...

❌ No products found. Make sure product-data-table.js exists and has data
```

## 根本原因

在之前的scripts优化（commit ee49245）中，**误删了 `generate-products-data-table.js` 脚本**，导致：

1. **`sync:feishu` 无法生成产品数据**
   - `ensure-product-data-table.js` 依赖 `generate-products-data-table.js`
   - 没有此脚本时，只能生成空的 `product-data-table.js`（`[]`）

2. **`i18n:extract` 找不到产品数据**
   - `product-i18n-adapter.js` 从 `product-data-table.js` 读取产品
   - 空数据导致提取失败

## 修复方案

### 1. 恢复删除的脚本

从git历史恢复 `generate-products-data-table.js`：

```bash
git show ee49245~1:scripts/generate-products-data-table.js > scripts/generate-products-data-table.js
```

### 2. 验证构建流程

执行完整的构建流程测试：

```bash
# Step 1: 从Feishu同步产品数据
npm run sync:feishu
# ✓ Loaded 12 series from Feishu
# ✓ Generated product-data-table.js with products

# Step 2: 提取产品i18n数据
npm run i18n:extract
# ✓ Extracted 2217 zh-CN product key/value pairs
# ✓ Saved to producti18n.json

# Step 3: 同步源文件
npm run product:sync:source
# ✓ Synced producti18n.json ↔ zh-CN.json (2217 keys)

# Step 4: 合并翻译
npm run merge:i18n
# ✓ Merged 21 languages with 52164 total keys
```

## 脚本功能说明

### generate-products-data-table.js

**核心功能**：
1. **从Feishu/XLSX读取产品数据**
   - Feishu API集成
   - Excel文件读取（XLSX库）

2. **多语言字段处理**
   - 支持22种语言
   - 字段映射：`name_en`, `name_zh-CN`, `highlights_de` 等
   - 自动生成 `i18nId` (SHA1 hash)

3. **数据验证和清理**
   - 删除不完整的产品数据
   - 质量检查和警告
   - 字段规范化

**数据结构**：
```javascript
{
  category: "大型商用炒菜机",
  products: [
    {
      category: "大型商用炒菜机",
      subCategory: "P_ESL",
      model: "ESL-GB60",
      name: null,  // 清空单语言字段
      highlights: null,
      scenarios: null,
      usage: null,
      power: "25kW",
      // ... 其他字段
      i18nId: "fe54294d",
      i18n: {
        category: { "zh-CN": "大型商用炒菜机" },
        subCategory: { "zh-CN": "P_ESL" },
        model: { "zh-CN": "ESL-GB60" },
        name: { "zh-CN": "座地式600电磁炒菜机触屏电动版" },
        highlights: { "zh-CN": "座地式设计；机械式自动翻锅；9档火力调节" },
        // ... 其他多语言字段
      }
    }
  ]
}
```

## 构建流程图

```
Feishu 数据
    ↓
generate-products-data-table.js
    ↓
src/assets/product-data-table.js (12个系列，2217个产品key)
    ↓
product-i18n-adapter.js --generate
    ↓
scripts/producti18n.json (平铺中文)
    ↓
product-sync-i18n.js
    ↓
src/assets/lang/*.json (21种语言)
    ↓
merge-translations.js
    ↓
src/assets/i18n.json (52164个key)
    ↓
Webpack构建
    ↓
dist/
```

## 关键依赖

| 依赖 | 作用 |
|-----|------|
| `feishu-config.json` | Feishu API凭证和配置 |
| `ensure-product-data-table.js` | 确保product-data-table.js存在 |
| `product-i18n-adapter.js` | 提取产品i18n数据 |
| `product-sync-i18n.js` | 同步产品翻译到各语言 |
| `merge-translations.js` | 合并所有语言文件 |

## 测试结果

| 命令 | 状态 | 结果 |
|-----|------|------|
| `sync:feishu` | ✅ 成功 | 12个系列产品 |
| `i18n:extract` | ✅ 成功 | 2217个产品key |
| `product:sync:source` | ✅ 成功 | 源文件同步完成 |
| `merge:i18n` | ✅ 成功 | 21种语言，52164个key |
| `build:withFeishu` | ✅ 成功 | 完整构建流程正常 |

## 经验教训

### 1. 脚本优化要谨慎

删除脚本前必须：
- ✅ 检查所有依赖关系
- ✅ 验证构建流程完整性
- ✅ 保留必要的核心脚本

### 2. 误删脚本的恢复方法

```bash
# 查找删除历史
git log --all --full-history -- "*generate-products-data-table.js"

# 从历史恢复
git show <commit-hash>^:scripts/generate-products-data-table.js > scripts/generate-products-data-table.js
```

### 3. 构建流程测试

修改任何构建相关脚本后，必须：
1. 测试单个命令
2. 测试完整流程
3. 验证所有输出文件

## 相关文件

- `scripts/generate-products-data-table.js` - 核心脚本（已恢复）
- `scripts/ensure-product-data-table.js` - 确保脚本存在
- `scripts/product-i18n-adapter.js` - i18n提取器
- `scripts/product-sync-i18n.js` - i18n同步器
- `scripts/merge-translations.js` - 翻译合并器
- `scripts/feishu-config.json` - Feishu配置

## Commit信息

- **Commit**: 619347a
- **Message**: 恢复generate-products-data-table.js脚本
- **Files Changed**: 1 file, 1263 insertions(+)

## 结论

通过恢复 `generate-products-data-table.js` 脚本，成功解决了 `build:withFeishu` 构建失败的问题。完整的产品数据获取和i18n处理流程现已恢复正常。

**下一步**：
- ✅ 恢复脚本 - 完成
- ✅ 测试流程 - 完成
- ✅ 提交修复 - 完成
- 📝 文档化 - 完成
- 🔄 后续优化：将此脚本集成到自动化流程中
