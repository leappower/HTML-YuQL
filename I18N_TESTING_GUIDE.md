# 多语言功能测试指南

## 问题诊断

用户反馈：**代码无切换多语言**

经过分析，发现可能的问题原因和解决方案：

### 已完成的修复

#### 1. 文件路径修复
**问题**: `translations.js`中加载`i18n.json`的路径错误
```javascript
// 之前 (错误)
const response = await fetch(`./i18n.json?ts=${Date.now()}`);

// 修复后 (正确)
const response = await fetch(`./assets/i18n.json?ts=${Date.now()}`);
```

**原因**: Webpack dev server将`src/assets`目录映射到`/assets`路径

#### 2. 文件生成确认
```bash
# 确认i18n.json已生成
node scripts/merge-translations.js
```

**结果**: ✅ 成功生成，包含22种语言，54,648个翻译键

#### 3. 服务器配置验证
```bash
# 验证HTTP访问
curl -s http://localhost:3000/assets/i18n.json | head -c 500
```

**结果**: ✅ HTTP 200，文件可正常访问

## 测试步骤

### 方法1: 使用测试页面（推荐）

#### 步骤1: 启动开发服务器
```bash
cd /Volumes/Extend\ HD/HTML-YuQL
npm start
```

#### 步骤2: 打开测试页面
在浏览器中访问:
```
http://localhost:3000/test-i18n-complete.html
```

#### 步骤3: 执行测试
1. 点击"加载测试脚本"按钮
2. 观察控制台输出
3. 检查系统状态徽章是否变为"正常"
4. 点击语言切换按钮测试不同语言

**预期结果**:
- ✅ 所有测试项显示为绿色（成功）
- ✅ 系统状态徽章显示"正常"
- ✅ 可以成功切换语言
- ✅ 页面内容随语言切换而更新

### 方法2: 浏览器开发者工具

#### 步骤1: 打开主页
```
http://localhost:3000/
```

#### 步骤2: 打开开发者工具
- Chrome/Edge: `F12` 或 `Ctrl+Shift+I`
- Firefox: `F12` 或 `Ctrl+Shift+I`

#### 步骤3: 检查Console标签

#### 步骤4: 执行测试代码
在Console中粘贴并运行以下代码：

```javascript
// 1. 检查全局函数
console.log('=== 全局函数检查 ===');
console.log('setLanguage:', typeof setLanguage);
console.log('translationManager:', typeof translationManager);
console.log('t:', typeof t);

// 2. 检查当前语言
if (translationManager) {
  console.log('当前语言:', translationManager.currentLanguage);
  console.log('已初始化:', translationManager.isInitialized);
  console.log('已缓存语言:', Array.from(translationManager.translationsCache.keys()));
}

// 3. 测试翻译
console.log('\n=== 翻译测试 ===');
console.log('company_name:', t('company_name'));
console.log('nav_contact:', t('nav_contact'));
console.log('nav_produkte:', t('nav_produkte'));

// 4. 测试语言切换
console.log('\n=== 语言切换测试 ===');
setLanguage('en')
  .then(() => {
    console.log('✅ 成功切换到 English');
    console.log('company_name:', t('company_name'));
  })
  .catch(err => console.error('❌ 切换失败:', err));

setLanguage('zh-CN')
  .then(() => {
    console.log('✅ 成功切换到 简体中文');
    console.log('company_name:', t('company_name'));
  })
  .catch(err => console.error('❌ 切换失败:', err));
```

**预期结果**:
- ✅ 所有全局函数已定义
- ✅ 当前语言显示为"zh-CN"或用户选择的语言
- ✅ `isInitialized`为`true`
- ✅ 已缓存语言包含至少3种（zh-CN, en, zh-TW）
- ✅ 翻译函数返回正确的文本
- ✅ 语言切换成功，Console显示成功消息

### 方法3: 手动测试UI

#### 步骤1: 打开主页
```
http://localhost:3000/
```

#### 步骤2: 查找语言切换按钮
在页面右上角应该有一个语言切换按钮，显示当前语言（如"中文（简体）"）

#### 步骤3: 点击语言按钮
应该展开一个下拉菜单，显示所有可用语言

#### 步骤4: 选择不同语言
点击任意语言选项（如"English"、"Deutsch"、"日本語"等）

**预期结果**:
- ✅ 语言按钮文字更新为所选语言
- ✅ 页面导航菜单文字更新为对应语言
- ✅ 公司名称更新为对应语言
- ✅ 页面标题更新为对应语言
- ✅ 所有`data-i18n`属性的内容都更新

## 常见问题排查

### 问题1: 语言按钮无法点击
**可能原因**: JavaScript未加载或出错

**解决方案**:
1. 检查浏览器Console是否有错误
2. 确认`bundle.js`已加载
3. 刷新页面（Ctrl+F5 强制刷新）

### 问题2: 语言切换后内容未更新
**可能原因**: 翻译未加载或DOM未更新

**解决方案**:
1. 打开Console执行`translationManager.debug()`
2. 检查当前语言的翻译是否已加载
3. 执行`translationManager.reloadTranslations()`强制重新加载

### 问题3: 404错误 - i18n.json未找到
**可能原因**: 文件路径错误或文件未生成

**解决方案**:
```bash
# 1. 确认文件存在
ls -lh src/assets/i18n.json

# 2. 确认可以访问
curl http://localhost:3000/assets/i18n.json

# 3. 如果文件不存在，重新生成
node scripts/merge-translations.js
```

### 问题4: 网络错误 - Failed to fetch
**可能原因**: 开发服务器未启动或CORS问题

**解决方案**:
1. 确认开发服务器正在运行: `npm start`
2. 检查端口3000是否被占用
3. 清除浏览器缓存并刷新

### 问题5: 翻译显示为key而不是翻译文本
**可能原因**: 翻译键不存在或格式错误

**解决方案**:
1. 在Console执行`translationManager.debug()`
2. 检查翻译键是否存在于当前语言
3. 检查翻译文件格式是否正确

## 调试命令

在浏览器Console中执行以下命令进行调试:

```javascript
// 查看翻译管理器状态
translationManager.debug()

// 重新加载当前语言翻译
translationManager.reloadTranslations()

// 查看所有可用语言
Object.keys(languageNames)

// 查看当前语言的所有翻译
translationManager.translationsCache.get(translationManager.currentLanguage)

// 测试特定翻译
t('company_name')

// 强制切换语言（绕过UI）
translationManager.setLanguage('en')
```

## 性能测试

### 首次加载时间测试
```javascript
console.time('i18n-load');
fetch('./assets/i18n.json')
  .then(r => r.json())
  .then(data => {
    console.timeEnd('i18n-load');
    console.log('文件大小:', JSON.stringify(data).length, 'bytes');
  });
```

**预期结果**: 加载时间应< 2秒（3.5MB文件）

### 语言切换时间测试
```javascript
console.time('lang-switch');
setLanguage('de')
  .then(() => {
    console.timeEnd('lang-switch');
  });
```

**预期结果**: 切换时间应< 100ms（从缓存加载）

## 验证清单

使用以下清单确认多语言功能完全正常：

- [ ] 开发服务器正在运行（端口3000）
- [ ] i18n.json文件存在于src/assets/目录
- [ ] i18n.json可以通过HTTP访问（/assets/i18n.json）
- [ ] 页面右上角显示语言切换按钮
- [ ] 点击语言按钮显示下拉菜单
- [ ] 下拉菜单包含22种语言选项
- [ ] 选择语言后按钮文字更新
- [ ] 页面所有文本更新为新语言
- [ ] Console无JavaScript错误
- [ ] `translationManager.isInitialized`为true
- [ ] 当前语言已缓存在`translationsCache`中

## 下一步

如果以上测试都通过，说明多语言功能正常。如果仍有问题，请：

1. 记录具体的错误消息
2. 截取Console中的错误信息
3. 提供重现步骤
4. 说明使用的浏览器和版本

## 相关文件

- `src/assets/translations.js` - 多语言管理器
- `src/assets/i18n.json` - 合并后的翻译文件（3.5MB）
- `scripts/merge-translations.js` - 合并脚本
- `webpack.config.js` - Webpack配置
- `test-i18n-complete.html` - 完整测试页面
- `test-i18n-detailed.js` - 详细测试脚本
