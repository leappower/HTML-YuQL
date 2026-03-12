# 多语言系统优化任务拆解计划

## 总体目标
实施方案 A + C + D 优化，分阶段、分步骤执行，每个小任务都要验证通过才能继续。

## 任务拆解原则
- **小任务**: 单个文件或功能的修改，提交前验证 lint + 测试数据
- **大任务**: 多个小任务组合，提交前验证 lint + 测试数据 + 打包流程
- **验证标准**: 必须验证通过才能继续，否则重复修复

---

## 方案 A: 按需加载 + 智能缓存

### A.1 创建单语言提取脚本 (小任务)
**目标**: 从i18n.json提取单个语言文件
- 创建 `scripts/extract-lang.js`
- 支持提取指定语言为独立JSON文件
- 生成22个单语言文件到 `dist/lang/`
- 验证: 脚本运行成功，生成正确文件

### A.2 修改加载逻辑支持按需加载 (小任务)
**目标**: 修改translations.js支持先加载当前语言
- 修改 `src/assets/translations.js` 的 `fetchTranslations` 方法
- 改为加载 `./assets/lang/${lang}.json` 而非 `./i18n.json`
- 添加其他语言的按需加载方法
- 验证: lint通过，逻辑正确

### A.3 添加语言切换预加载 (小任务)
**目标**: 在切换语言时预加载新语言
- 添加 `preloadLanguage` 方法
- 在切换语言前预加载目标语言
- 实现平滑切换过渡
- 验证: lint通过，逻辑正确

### A.4 创建Service Worker缓存 (小任务)
**目标**: 实现离线缓存语言文件
- 创建 `src/sw.js` Service Worker
- 缓存所有语言文件
- 实现离线降级策略
- 验证: lint通过，Service Worker正常

### A.5 注册Service Worker (小任务)
**目标**: 在应用启动时注册Service Worker
- 修改 `src/assets/init.js`
- 添加Service Worker注册代码
- 处理更新逻辑
- 验证: lint通过，注册成功

### A.6 测试按需加载功能 (大任务)
**目标**: 验证按需加载和缓存功能
- 运行 `npm run lint:All`
- 测试单语言文件生成
- 测试语言切换和预加载
- 测试Service Worker缓存
- 验证: 打包流程通过，功能正常

---

## 方案 C: 构建流程优化

### C.1 创建统一构建脚本 (小任务)
**目标**: 合并所有构建步骤
- 创建 `scripts/build-i18n.js`
- 整合 i18n:extract, product:sync:source, merge:i18n, translate:products, product:sync
- 统一错误处理和日志输出
- 验证: 脚本运行成功，输出正确

### C.2 修改package.json使用新构建脚本 (小任务)
**目标**: 简化npm scripts
- 修改 `build` 脚本调用统一构建脚本
- 修改 `build:fast` 脚本
- 保持向后兼容
- 验证: package.json格式正确

### C.3 添加增量构建支持 (小任务)
**目标**: 只重新修改的部分
- 修改 `scripts/merge-translations.js` 检查文件变化
- 只重新构建变化的语言文件
- 添加缓存机制
- 验证: 增量构建工作正常

### C.4 清理冗余文件 (小任务)
**目标**: 移除不必要的文件
- 删除 `scripts/copy-translations.js` (已被copy-i18n.js替代)
- 清理临时文件和缓存
- 更新文档
- 验证: 文件清理正确，无残留

### C.5 测试构建流程优化 (大任务)
**目标**: 验证新构建流程
- 运行 `npm run lint:All`
- 测试完整构建流程 `npm run build`
- 测试快速构建流程 `npm run build:fast`
- 测试增量构建
- 验证: 打包流程通过，时间减少50%

---

## 方案 D: 压缩优化

### D.1 安装Brotli压缩依赖 (小任务)
**目标**: 添加Brotli压缩工具
- 安装 `brotli-size` 和 `compression` 包
- 验证: 依赖安装成功

### D.2 创建压缩脚本 (小任务)
**目标**: 压缩i18n.json文件
- 创建 `scripts/compress-i18n.js`
- 生成i18n.json.br (Brotli格式)
- 生成压缩统计信息
- 验证: 压缩成功，文件大小减少90%+

### D.3 配置Webpack支持Brotli (小任务)
**目标**: 在开发环境支持Brotli
- 修改 `webpack.config.js`
- 添加CompressionPlugin配置
- 启用Brotli压缩
- 验证: webpack配置正确

### D.4 添加压缩步骤到构建流程 (小任务)
**目标**: 集成压缩到构建
- 修改 `scripts/copy-i18n.js` 调用压缩脚本
- 或创建新的 `scripts/build-i18n.js` 包含压缩
- 验证: 压缩步骤执行成功

### D.5 测试压缩优化 (大任务)
**目标**: 验证压缩效果
- 运行 `npm run lint:All`
- 测试压缩生成
- 测试浏览器加载压缩文件
- 测试构建流程完整通过
- 验证: 文件大小减少91%，功能正常

---

## 方案 B: 懒加载 + 预加载策略

### B.1 分离UI和产品数据 (小任务)
**目标**: 将翻译文件分为两部分
- 分析当前翻译键，区分UI和产品数据
- 创建 `scripts/split-translations.js`
- 生成 `ui-i18n.json` 和 `product-i18n.json`
- 验证: 分离正确，无数据丢失

### B.2 创建UI翻译文件生成脚本 (小任务)
**目标**: 只包含UI相关的翻译
- 创建 `scripts/build-ui-i18n.js`
- 从翻译文件提取UI键（排除产品相关）
- 生成22种语言的UI翻译
- 验证: 生成正确，大小合理

### B.3 创建产品数据翻译文件 (小任务)
**目标**: 只包含产品数据的翻译
- 创建 `scripts/build-product-i18n.js`
- 提取产品相关翻译键
- 生成产品数据翻译文件
- 验证: 生成正确，数据完整

### B.4 修改加载逻辑支持分离加载 (小任务)
**目标**: 先加载UI，延迟加载产品
- 修改 `src/assets/translations.js`
- 添加 `loadUITranslations` 和 `loadProductTranslations` 方法
- 实现优先级加载
- 验证: lint通过，逻辑正确

### B.5 实现产品数据懒加载 (小任务)
**目标**: 在需要时加载产品数据
- 添加 `lazyLoadProductData` 方法
- 在访问产品页面时触发加载
- 添加加载指示器
- 验证: lint通过，逻辑正确

### B.6 添加预加载策略 (小任务)
**目标**: 在空闲时预加载产品数据
- 添加 `preloadProductData` 方法
- 使用 requestIdleCallback 或 IntersectionObserver
- 智能判断何时预加载
- 验证: lint通过，逻辑正确

### B.7 更新初始化流程 (小任务)
**目标**: 启动时只加载UI翻译
- 修改 `src/assets/init.js`
- 调用 `loadUITranslations` 而非完整加载
- 延迟加载产品数据
- 验证: lint通过，初始化正确

### B.8 测试懒加载和预加载 (大任务)
**目标**: 验证分离加载效果
- 运行 `npm run lint:All`
- 测试UI翻译加载
- 测试产品数据懒加载
- 测试预加载触发
- 测试TTI（Time to Interactive）改善
- 验证: 打包流程通过，TTI显著改善

---

## 执行顺序

按照您的要求，将执行以下顺序：

1. **方案 B** (懒加载 + 预加载策略) - B.1 到 B.8
2. **方案 A** (按需加载 + 智能缓存) - A.1 到 A.6
3. **方案 C** (构建流程优化) - C.1 到 C.5
4. **方案 D** (压缩优化) - D.1 到 D.5

---

## 验证标准

### 小任务验证
- ✅ `npm run lint:All` 通过
- ✅ 测试数据正确生成
- ✅ 无JavaScript错误
- ✅ 功能逻辑正确

### 大任务验证
- ✅ 小任务验证全部通过
- ✅ `npm run build` 打包流程通过
- ✅ `npm run build:fast` 快速构建通过
- ✅ 功能测试通过
- ✅ 性能指标达到预期

---

## 提交规范

### 小任务提交格式
```
feat/bfix/chore: [方案][任务编号] 简短描述

- 具体修改内容
- 影响的文件列表
- 验证结果
```

### 大任务提交格式
```
feat: [方案名称] 完整实现

- 实现的功能
- 性能提升指标
- 测试结果
- 相关的小任务提交
```

---

## 当前进度

- [x] 提交当前代码到本地
- [ ] 方案 B - 懒加载 + 预加载策略
  - [ ] B.1 - B.7 (小任务)
  - [ ] B.8 (大任务)
- [ ] 方案 A - 按需加载 + 智能缓存
  - [ ] A.1 - A.5 (小任务)
  - [ ] A.6 (大任务)
- [ ] 方案 C - 构建流程优化
  - [ ] C.1 - C.4 (小任务)
  - [ ] C.5 (大任务)
- [ ] 方案 D - 压缩优化
  - [ ] D.1 - D.4 (小任务)
  - [ ] D.5 (大任务)
