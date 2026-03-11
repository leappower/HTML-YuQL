#!/usr/bin/env node
/**
 * 修复 producti18n.json 中被错误分割的翻译数据
 * 将字符对象格式转换为正确的字符串格式
 */

const fs = require('fs').promises;
const path = require('path');

const PRODUCTI18N_FILE = path.join(__dirname, 'producti18n.json');
const BACKUP_FILE = path.join(__dirname, 'producti18n.json.backup');

async function fixProductI18nFormat() {
    try {
        console.log('🔍 正在读取 producti18n.json...');
        
        // 读取原始文件
        const rawData = await fs.readFile(PRODUCTI18N_FILE, 'utf8');
        const data = JSON.parse(rawData);
        
        console.log('📦 已读取产品翻译数据');
        
        // 创建备份
        await fs.writeFile(BACKUP_FILE, rawData, 'utf8');
        console.log('✅ 已创建备份文件: producti18n.json.backup');
        
        // 修复数据格式
        const fixedData = {};
        let fixedCount = 0;
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 检查是否为字符索引对象格式
                const keys = Object.keys(value);
                const isCharacterArray = keys.every(k => /^\d+$/.test(k));
                
                if (isCharacterArray) {
                    // 将字符索引对象重新拼接为字符串
                    const sortedKeys = keys.map(k => parseInt(k)).sort((a, b) => a - b);
                    const reconstructedString = sortedKeys.map(index => value[index.toString()]).join('');
                    fixedData[key] = reconstructedString;
                    fixedCount++;
                } else {
                    fixedData[key] = value;
                }
            } else {
                fixedData[key] = value;
            }
        }
        
        console.log(`🔧 已修复 ${fixedCount} 个异常格式的翻译条目`);
        
        // 写入修复后的数据
        const fixedJson = JSON.stringify(fixedData, null, 2);
        await fs.writeFile(PRODUCTI18N_FILE, fixedJson, 'utf8');
        
        console.log('✅ 修复完成！已保存到 producti18n.json');
        console.log('📄 备份文件保存在: producti18n.json.backup');
        
        // 显示修复示例
        const exampleKeys = Object.keys(fixedData).slice(0, 3);
        console.log('\n🎯 修复示例:');
        for (const key of exampleKeys) {
            console.log(`  ${key}: "${fixedData[key]}"`);
        }
        
    } catch (error) {
        console.error('❌ 修复过程中出现错误:', error);
        process.exit(1);
    }
}

// 运行修复脚本
fixProductI18nFormat();