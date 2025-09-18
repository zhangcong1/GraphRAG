#!/usr/bin/env node

/**
 * 测试脚本 - 使用重构后的解析器分析Vue组件示例
 */

const fs = require('fs').promises;
const path = require('path');

// 模拟解析测试
async function testParseVueExample() {
    console.log('🚀 开始测试Vue组件示例的知识图谱构建...\n');
    
    const testDir = path.join(__dirname, 'test-demo');
    console.log(`📁 测试目录: ${testDir}\n`);
    
    // 检查文件是否存在
    const files = [
        'types/cart.ts',
        'utils/apiService.ts', 
        'utils/cartUtils.ts',
        'components/ShoppingCart.vue',
        'components/ProductItem.vue',
        'components/CartSummary.vue',
        'README.md'
    ];
    
    console.log('📄 检查创建的文件:');
    for (const file of files) {
        const fullPath = path.join(testDir, file);
        try {
            const stats = await fs.stat(fullPath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`  ✅ ${file} (${sizeKB}KB)`);
        } catch (error) {
            console.log(`  ❌ ${file} - 文件不存在`);
        }
    }
    
    console.log('\n🔍 分析预期实体和关系:');
    
    // 分析类型定义文件
    try {
        const cartTypesContent = await fs.readFile(path.join(testDir, 'types/cart.ts'), 'utf8');
        const interfaceMatches = cartTypesContent.match(/export interface \w+/g) || [];
        const typeMatches = cartTypesContent.match(/export type \w+/g) || [];
        console.log(`  📝 types/cart.ts: ${interfaceMatches.length} 接口, ${typeMatches.length} 类型`);
        console.log(`     接口: ${interfaceMatches.map(m => m.replace('export interface ', '')).join(', ')}`);
    } catch (error) {
        console.log('  ❌ 无法读取types/cart.ts');
    }
    
    // 分析工具函数
    try {
        const cartUtilsContent = await fs.readFile(path.join(testDir, 'utils/cartUtils.ts'), 'utf8');
        const functionMatches = cartUtilsContent.match(/export function \w+/g) || [];
        console.log(`  🔧 utils/cartUtils.ts: ${functionMatches.length} 导出函数`);
        console.log(`     函数: ${functionMatches.map(m => m.replace('export function ', '')).join(', ')}`);
    } catch (error) {
        console.log('  ❌ 无法读取utils/cartUtils.ts');
    }
    
    // 分析API服务
    try {
        const apiServiceContent = await fs.readFile(path.join(testDir, 'utils/apiService.ts'), 'utf8');
        const classMatches = apiServiceContent.match(/export class \w+/g) || [];
        const methodMatches = apiServiceContent.match(/async \w+\(/g) || [];
        console.log(`  🌐 utils/apiService.ts: ${classMatches.length} 类, ${methodMatches.length} 异步方法`);
    } catch (error) {
        console.log('  ❌ 无法读取utils/apiService.ts');
    }
    
    // 分析Vue组件
    const vueFiles = ['ShoppingCart.vue', 'ProductItem.vue', 'CartSummary.vue'];
    for (const vueFile of vueFiles) {
        try {
            const vueContent = await fs.readFile(path.join(testDir, 'components', vueFile), 'utf8');
            const importMatches = vueContent.match(/import .+ from ['"]/g) || [];
            const defineMatches = vueContent.match(/const \w+ = /g) || [];
            console.log(`  🎨 components/${vueFile}: ${importMatches.length} 导入, ${defineMatches.length} 定义`);
        } catch (error) {
            console.log(`  ❌ 无法读取components/${vueFile}`);
        }
    }
    
    console.log('\n📊 预期的知识图谱统计:');
    console.log('  📁 目录节点: 4个 (test-demo, types, utils, components)');
    console.log('  📄 文件节点: 7个 (包括README.md)');
    console.log('  🔧 代码实体: 35-45个 (接口、类、函数、组件)');
    console.log('  🔗 关系边: 80-100条 (包含、定义、导入、调用等)');
    
    console.log('\n🎯 主要关联关系:');
    console.log('  1. CONTAINS: 目录包含文件关系');
    console.log('  2. DEFINED_IN: 代码实体定义在文件中');
    console.log('  3. IMPORTS: 文件间的导入依赖');
    console.log('  4. EXPORTS: 文件的导出内容');
    console.log('  5. CALLS: 函数调用关系');
    console.log('  6. RELATED_TO: 基于语义标签的关联');
    
    console.log('\n💡 测试建议:');
    console.log('  1. 在VS Code中打开test-demo目录');
    console.log('  2. 运行"构建知识图谱"命令');
    console.log('  3. 检查生成的.huima/kg.json文件');
    console.log('  4. 运行"查看知识图谱"命令，观察可视化效果');
    console.log('  5. 验证各种关联关系是否正确识别');
    
    console.log('\n✨ 测试完成! 可以开始验证解析器效果了。');
}

testParseVueExample().catch(console.error);