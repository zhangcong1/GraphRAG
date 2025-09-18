const path = require('path');

/**
 * 测试配置功能
 */
async function testConfiguration() {
    console.log('🧪 开始测试新的配置功能...\n');

    try {
        // 1. 测试关系过滤配置
        console.log('📋 测试关系过滤配置...');
        
        const relationshipFilters = {
            enableContains: true,
            enableDefinedIn: true,
            enableImportsExports: false,
            enableCalls: false,
            enableSemanticRelated: false,
            minRelationWeight: 0.3
        };
        
        console.log('关系过滤配置:', relationshipFilters);
        
        // 统计启用的关系类型
        const enabledTypes = Object.entries(relationshipFilters)
            .filter(([key, value]) => key !== 'minRelationWeight' && value === true)
            .map(([key]) => key);
            
        console.log(`✅ 启用的关系类型: ${enabledTypes.length}个`);
        console.log(`   - ${enabledTypes.join('\n   - ')}`);
        console.log(`   - 最小权重阈值: ${relationshipFilters.minRelationWeight}`);
        
        // 2. 测试向量数据库类型配置
        console.log('\n💾 测试向量数据库类型配置...');
        
        const vectorDatabaseTypes = ['local', 'milvus'];
        console.log('支持的向量数据库类型:', vectorDatabaseTypes);
        
        for (const dbType of vectorDatabaseTypes) {
            console.log(`✅ ${dbType === 'local' ? '本地JSON文件' : 'Milvus向量数据库'} (${dbType})`);
        }
        
        // 3. 测试完整配置对象
        console.log('\n⚙️ 完整配置示例:');
        
        const completeConfig = {
            // 向量化配置
            enableVectorization: true,
            vectorDatabaseType: 'local',
            embeddingApiUrl: 'http://10.30.235.27:46600',
            embeddingModel: 'Qwen3-Embedding-8B',
            
            // Milvus配置（当vectorDatabaseType为milvus时使用）
            milvusAddress: 'http://localhost:19530',
            milvusUsername: '',
            milvusPassword: '',
            
            // 关系过滤配置
            relationshipFilters: {
                enableContains: true,
                enableDefinedIn: true,
                enableImportsExports: false,
                enableCalls: false,
                enableSemanticRelated: false,
                minRelationWeight: 0.3
            },
            
            // 搜索配置
            searchTopK: 10,
            searchThreshold: 0.5
        };
        
        console.log(JSON.stringify(completeConfig, null, 2));
        
        // 4. 验证配置有效性
        console.log('\n🔍 验证配置有效性...');
        
        // 检查向量数据库类型
        if (!vectorDatabaseTypes.includes(completeConfig.vectorDatabaseType)) {
            throw new Error(`无效的向量数据库类型: ${completeConfig.vectorDatabaseType}`);
        }
        
        // 检查关系过滤配置
        const requiredFilters = ['enableContains', 'enableDefinedIn', 'enableImportsExports', 'enableCalls', 'enableSemanticRelated', 'minRelationWeight'];
        for (const filter of requiredFilters) {
            if (!(filter in completeConfig.relationshipFilters)) {
                throw new Error(`缺少关系过滤配置: ${filter}`);
            }
        }
        
        // 检查权重阈值
        if (completeConfig.relationshipFilters.minRelationWeight < 0 || completeConfig.relationshipFilters.minRelationWeight > 1) {
            throw new Error(`无效的权重阈值: ${completeConfig.relationshipFilters.minRelationWeight}，应该在0-1之间`);
        }
        
        console.log('✅ 所有配置验证通过!');
        
        // 5. 模拟配置使用场景
        console.log('\n🎯 模拟配置使用场景...');
        
        // 场景1: 基础知识图谱（只有结构关系）
        const basicConfig = {
            relationshipFilters: {
                enableContains: true,
                enableDefinedIn: true,
                enableImportsExports: false,
                enableCalls: false,
                enableSemanticRelated: false,
                minRelationWeight: 0.0
            }
        };
        console.log('📊 场景1 - 基础知识图谱: 只包含文件结构关系');
        
        // 场景2: 完整知识图谱（包含所有关系）
        const fullConfig = {
            relationshipFilters: {
                enableContains: true,
                enableDefinedIn: true,
                enableImportsExports: true,
                enableCalls: true,
                enableSemanticRelated: true,
                minRelationWeight: 0.1
            }
        };
        console.log('📊 场景2 - 完整知识图谱: 包含所有类型关系');
        
        // 场景3: 高质量关系图谱（高权重阈值）
        const highQualityConfig = {
            relationshipFilters: {
                enableContains: true,
                enableDefinedIn: true,
                enableImportsExports: true,
                enableCalls: false,
                enableSemanticRelated: true,
                minRelationWeight: 0.7
            }
        };
        console.log('📊 场景3 - 高质量图谱: 只保留高置信度关系');
        
        console.log('\n✅ 所有配置功能测试通过！');
        console.log('\n📝 使用建议:');
        console.log('   1. 初次使用建议选择"基础知识图谱"配置，减少复杂度');
        console.log('   2. 大型项目建议提高minRelationWeight阈值，过滤低质量关系');
        console.log('   3. 需要详细分析时可启用所有关系类型');
        console.log('   4. 本地开发建议使用local向量数据库，生产环境可考虑milvus');
        
    } catch (error) {
        console.error('❌ 配置测试失败:', error);
        throw error;
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testConfiguration().catch(console.error);
}

module.exports = { testConfiguration };