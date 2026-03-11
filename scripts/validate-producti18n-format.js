#!/usr/bin/env node
/**
 * 验证 producti18n.json 格式是否正确
 */

const fs = require('fs');
const path = require('path');

const PRODUCTI18N_FILE = path.join(__dirname, 'producti18n.json');

function validateProductI18nFormat() {
    try {
        console.log('🔍 正在验证 producti18n.json 格式...');

        // 读取文件
        const rawData = fs.readFileSync(PRODUCTI18N_FILE, 'utf8');
        const data = JSON.parse(rawData);
        
        let totalKeys = 0;
        let stringKeys = 0;
        let objectKeys = 0;
        let brokenFormats = [];
        
        // 检查每个条目的格式
        for (const [key, value] of Object.entries(data)) {
            totalKeys++;
            
            if (typeof value === 'string') {
                stringKeys++;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 检查是否为字符索引对象格式
                const keys = Object.keys(value);
                const isCharacterArray = keys.every(k => /^\d+$/.test(k));

                // producti18n 规范要求 value 必须是字符串；对象一律视为异常
                brokenFormats.push(key);
                objectKeys++;
            } else {
                brokenFormats.push(key);
            }
        }
        
        console.log('\n📊 格式验证结果:');
        console.log(`  总条目数: ${totalKeys}`);
        console.log(`  字符串格式: ${stringKeys}`);
        console.log(`  对象格式: ${objectKeys}`);
        console.log(`  异常格式: ${brokenFormats.length}`);
        
        if (brokenFormats.length === 0) {
            console.log('✅ 所有翻译数据格式正确！');
            
            // 显示一些示例数据
            const exampleKeys = Object.keys(data).slice(0, 5);
            console.log('\n📄 示例数据:');
            for (const key of exampleKeys) {
                const value = data[key];
                const truncatedValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
                console.log(`  ${key}: "${truncatedValue}"`);
            }
        } else {
            console.log(`❌ 发现 ${brokenFormats.length} 个异常格式条目（应为 string）:`);
            brokenFormats.slice(0, 5).forEach(key => {
                console.log(`  - ${key}`);
            });
            if (brokenFormats.length > 5) {
                console.log(`  ... 还有 ${brokenFormats.length - 5} 个`);
            }
        }
        
    } catch (error) {
        console.error('❌ 验证过程中出现错误:', error.message);
        process.exit(1);
    }
}

// 运行验证
validateProductI18nFormat();