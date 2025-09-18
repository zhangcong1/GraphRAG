const { LocalVectorDB } = require('./out/vectordb/LocalVectorDB.js');
const { EmbeddingService } = require('./out/embedding/EmbeddingService.js');
const { KnowledgeGraphVectorizer } = require('./out/vectorization/KnowledgeGraphVectorizer.js');
const path = require('path');

/**
 * 测试向量化功能
 */
async function testVectorization() {
    console.log('🧪 开始测试向量化功能...\n');

    const projectPath = __dirname;
    
    try {
        // 1. 测试 EmbeddingService
        console.log('📡 测试 Embedding 服务...');
        const embeddingService = new EmbeddingService({
            apiUrl: 'http://10.30.235.27:46600',
            model: 'Qwen3-Embedding-8B'
        });

        const testTexts = [
            '用户认证和授权功能',
            '数据库连接和查询',
            'API接口定义',
            '前端组件渲染'
        ];

        console.log('测试文本:', testTexts);
        
        // 使用模拟数据进行测试
        const embeddings = await embeddingService.getEmbeddings(testTexts, true);
        console.log(`✅ 成功获取 ${embeddings.length} 个向量，维度: ${embeddings[0].length}`);

        // 2. 测试 LocalVectorDB
        console.log('\n💾 测试本地向量数据库...');
        const vectorDB = new LocalVectorDB(projectPath);
        
        const collectionName = 'test_collection';
        const dimension = embeddings[0].length;
        
        vectorDB.createCollection(collectionName, dimension);
        
        const documents = testTexts.map((text, index) => ({
            id: `test_doc_${index + 1}`,
            vector: embeddings[index],
            content: text,
            metadata: {
                source: 'test',
                index: index,
                created: new Date().toISOString()
            }
        }));
        
        vectorDB.insert(collectionName, documents);
        console.log(`✅ 成功插入 ${documents.length} 个文档`);

        // 3. 测试向量搜索
        console.log('\n🔍 测试向量搜索...');
        const queryText = '用户登录功能';
        const queryEmbedding = (await embeddingService.getEmbeddings([queryText], true))[0];
        
        const searchResults = vectorDB.search(collectionName, queryEmbedding, { topK: 3 });
        
        console.log(`搜索查询: "${queryText}"`);
        console.log('搜索结果:');
        searchResults.forEach((result, index) => {
            console.log(`${index + 1}. 相似度: ${(result.score * 100).toFixed(2)}% | ${result.document.content}`);
        });

        // 4. 测试 KnowledgeGraphVectorizer
        console.log('\n🕸️ 测试知识图谱向量化器...');
        const vectorizer = new KnowledgeGraphVectorizer(projectPath, {
            apiUrl: 'http://10.30.235.27:46600',
            model: 'Qwen3-Embedding-8B'
        }, {
            useSimulation: true
        });

        // 模拟知识图谱节点
        const mockNodes = [
            {
                id: 'node_1',
                name: 'loginUser',
                element_type: 'function',
                file_name: 'auth.js',
                file_path: path.join(projectPath, 'src/auth.js'),
                code_snippet: 'function loginUser(username, password) { /* auth logic */ }',
                semantic_tags: ['authentication', 'user', 'login']
            },
            {
                id: 'node_2',
                name: 'UserModel',
                element_type: 'class',
                file_name: 'models.js',
                file_path: path.join(projectPath, 'src/models.js'),
                code_snippet: 'class UserModel { constructor() { /* model logic */ } }',
                semantic_tags: ['model', 'user', 'database']
            },
            {
                id: 'node_3',
                name: 'apiRoutes',
                element_type: 'object',
                file_name: 'routes.js',
                file_path: path.join(projectPath, 'src/routes.js'),
                code_snippet: 'const apiRoutes = { GET: "/api/users", POST: "/api/login" }',
                semantic_tags: ['api', 'routes', 'endpoints']
            }
        ];

        const vectorizationResult = await vectorizer.vectorizeKnowledgeGraph(
            mockNodes,
            'test_knowledge_graph',
            (progress, total, message) => {
                console.log(`进度: ${progress}/${total} - ${message}`);
            }
        );

        console.log('向量化结果:', vectorizationResult);

        // 5. 测试知识图谱搜索
        console.log('\n🎯 测试知识图谱搜索...');
        const kgSearchResults = await vectorizer.searchSimilarNodes(
            '用户登录相关功能',
            'test_knowledge_graph',
            { topK: 3 }
        );

        console.log('知识图谱搜索结果:');
        kgSearchResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.document.metadata.nodeId} (${(result.score * 100).toFixed(2)}%)`);
            console.log(`   类型: ${result.document.metadata.elementType}`);
            console.log(`   文件: ${result.document.metadata.fileName}`);
            console.log(`   内容: ${result.document.content.substring(0, 100)}...`);
            console.log();
        });

        // 6. 显示数据库统计
        console.log('📊 向量数据库统计:');
        const stats = vectorizer.getVectorDBStats();
        console.log(JSON.stringify(stats, null, 2));

        console.log('\n✅ 所有测试通过！向量化功能工作正常。');

    } catch (error) {
        console.error('❌ 测试失败:', error);
        throw error;
    }
}

/**
 * 运行测试
 */
async function runTests() {
    try {
        await testVectorization();
        console.log('\n🎉 向量化功能测试完成！');
    } catch (error) {
        console.error('\n💥 测试失败:', error);
        process.exit(1);
    }
}

// 执行测试
if (require.main === module) {
    runTests();
}

module.exports = { testVectorization };