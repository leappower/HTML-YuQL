// 详细的多语言测试脚本

console.log('=== 开始多语言系统测试 ===\n');

// 测试1: 检查必要的全局函数
console.log('1. 检查全局函数...');
const globalFunctions = [
  'setLanguage',
  'toggleLanguageDropdown',
  'filterLanguages',
  'translationManager',
  't'
];

globalFunctions.forEach(fn => {
  if (typeof window[fn] !== 'undefined') {
    console.log(`   ✅ ${fn} 已定义`);
  } else {
    console.log(`   ❌ ${fn} 未定义`);
  }
});

// 测试2: 检查DOM元素
console.log('\n2. 检查DOM元素...');
const domElements = [
  'language-dropdown',
  'lang-dropdown-btn',
  'current-lang-label',
  'lang-dropdown-container'
];

domElements.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    console.log(`   ✅ #${id} 存在`);
  } else {
    console.log(`   ❌ #${id} 不存在`);
  }
});

// 测试3: 检查语言选项
console.log('\n3. 检查语言选项按钮...');
const langOptions = document.querySelectorAll('.lang-option');
console.log(`   ✅ 找到 ${langOptions.length} 个语言选项`);

langOptions.forEach(btn => {
  const code = btn.getAttribute('data-code');
  const text = btn.querySelector('span:first-child')?.textContent;
  console.log(`   - ${code}: ${text}`);
});

// 测试4: 测试加载i18n.json
console.log('\n4. 测试加载i18n.json...');
fetch('./assets/i18n.json?ts=' + Date.now())
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(`   ✅ 成功加载 i18n.json`);
    console.log(`   📊 包含 ${Object.keys(data).length} 种语言`);

    // 测试5: 检查翻译管理器状态
    console.log('\n5. 检查翻译管理器状态...');
    if (window.translationManager) {
      console.log(`   当前语言: ${window.translationManager.currentLanguage}`);
      console.log(`   已缓存语言: ${Array.from(window.translationManager.translationsCache.keys()).join(', ') || '(无)'}`);
      console.log(`   已初始化: ${window.translationManager.isInitialized}`);
    }

    // 测试6: 测试翻译函数
    console.log('\n6. 测试翻译函数...');
    const testKeys = ['company_name', 'nav_contact', 'nav_produkte'];
    testKeys.forEach(key => {
      const translation = window.t ? window.t(key) : 't函数未定义';
      console.log(`   ${key}: ${translation}`);
    });

    console.log('\n=== 测试完成 ===');
  })
  .catch(error => {
    console.log(`   ❌ 加载失败: ${error.message}`);
    console.log('\n=== 测试失败 ===');
  });

// 测试7: 模拟语言切换
console.log('\n7. 测试语言切换...');
const testLanguages = ['en', 'zh-CN', 'de'];
let testIndex = 0;

function testNextLanguage() {
  if (testIndex >= testLanguages.length) {
    console.log('   ✅ 语言切换测试完成');
    return;
  }

  const lang = testLanguages[testIndex];
  console.log(`   切换到 ${lang}...`);

  if (typeof setLanguage === 'function') {
    setLanguage(lang)
      .then(() => {
        console.log(`   ✅ 成功切换到 ${lang}`);
        testIndex++;
        setTimeout(testNextLanguage, 1000);
      })
      .catch(error => {
        console.log(`   ❌ 切换失败: ${error.message}`);
        testIndex++;
        setTimeout(testNextLanguage, 1000);
      });
  } else {
    console.log(`   ⚠️  setLanguage函数未定义，跳过测试`);
    testIndex = testLanguages.length;
  }
}

// 延迟执行切换测试
setTimeout(testNextLanguage, 2000);
