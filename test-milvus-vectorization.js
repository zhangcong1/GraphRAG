/**
 * 测试 Milvus 向量化功能
 */
const { MilvusKnowledgeGraphVectorizer } = require('./out/vectorization/MilvusKnowledgeGraphVectorizer.js');
const path = require('path');

/**
 * 测试 Milvus 向量化功能
 */
async function testMilvusVectorization() {
    console.log('🧪 开始测试 Milvus 向量化功能...\n');

    const projectPath = __dirname;
    
    try {
        // 1. 初始化向量化器
        console.log('📡 初始化 Milvus 向量化器...');
        const vectorizer = new MilvusKnowledgeGraphVectorizer(
            projectPath,
            {
                apiUrl: 'http://10.30.235.27:46600',
                model: 'Qwen3-Embedding-8B',
                maxBatchSize: 5
            },
            {
                address: 'http://localhost:19530', // 本地 Milvus
                username: '',
                password: ''
            },
            {
                useSimulation: true, // 使用模拟数据进行测试
                batchSize: 3,
                dimension: 128
            }
        );

        // 2. 测试连接
        console.log('🔗 测试连接...');
        const connections = await vectorizer.testConnections();
        console.log(`Embedding 服务: ${connections.embedding ? '✅' : '❌'}`);
        console.log(`Milvus 服务: ${connections.milvus ? '✅' : '❌'}`);

        if (!connections.milvus) {
            console.log('⚠️ Milvus 连接失败，请确保 Milvus 服务运行在 localhost:19530');
            console.log('💡 可以使用 Docker 启动 Milvus:');
            console.log('   docker run -p 19530:19530 -p 9091:9091 milvusdb/milvus:latest');
            return;
        }

        // 3. 准备测试数据
        console.log('\n📝 准备测试数据...');
        const mockNodes = [
            {
                id: 'node_auth_login',
                name: 'loginUser',
                element_type: 'function',
                file_name: 'auth.ts',
                file_path: path.join(projectPath, 'src/auth.ts'),
                start_line: 10,
                end_line: 25,
                code_snippet: `
function loginUser(username: string, password: string): Promise<User> {
    // 验证用户凭据
    const hashedPassword = hashPassword(password);
    const user = userRepository.findByCredentials(username, hashedPassword);
    
    if (!user) {
        throw new Error('Invalid credentials');
    }
    
    // 生成JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    return { ...user, token };
}`.trim(),
                semantic_tags: ['authentication', 'user', 'login', 'security']
            },
            {
                id: 'node_user_model',
                name: 'UserModel',
                element_type: 'class',
                file_name: 'models.ts',
                file_path: path.join(projectPath, 'src/models.ts'),
                start_line: 5,
                end_line: 20,
                code_snippet: `
class UserModel {
    public id: string;
    public username: string;
    public email: string;
    private passwordHash: string;
    
    constructor(data: UserData) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.passwordHash = data.passwordHash;
    }
    
    validatePassword(password: string): boolean {
        return bcrypt.compare(password, this.passwordHash);
    }
}`.trim(),
                semantic_tags: ['model', 'user', 'database', 'entity']
            },
            {
                id: 'node_api_routes',
                name: 'authRoutes',
                element_type: 'object',
                file_name: 'routes.ts',
                file_path: path.join(projectPath, 'src/routes.ts'),
                start_line: 15,
                end_line: 30,
                code_snippet: `
const authRoutes = {
    'POST /api/login': loginController,
    'POST /api/register': registerController,
    'POST /api/logout': logoutController,
    'GET /api/profile': profileController,
    'PUT /api/profile': updateProfileController
};`.trim(),
                semantic_tags: ['api', 'routes', 'endpoints', 'rest']
            },
            {
                id: 'node_react_component',
                name: 'LoginForm',
                element_type: 'component',
                file_name: 'LoginForm.tsx',
                file_path: path.join(projectPath, 'src/components/LoginForm.tsx'),
                start_line: 1,
                end_line: 40,
                code_snippet: `
export const LoginForm: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const result = await authService.login(username, password);
            onLoginSuccess(result.user);
        } catch (error) {
            setError('Login failed');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username" 
            />
            <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" 
            />
            <button type="submit" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
};`.trim(),
                semantic_tags: ['frontend', 'component', 'form', 'react', 'ui']
            }
        ];

        console.log(`准备了 ${mockNodes.length} 个测试节点`);

        // 4. 执行向量化
        console.log('\n🕸️ 开始向量化...');
        const vectorizationResult = await vectorizer.vectorizeKnowledgeGraph(
            mockNodes,
            undefined, // 使用默认集合名
            (progress, total, message) => {
                console.log(`  进度: ${Math.round(progress)}/${total} - ${message}`);
            }
        );

        console.log('\n✅ 向量化结果:');
        console.log(`  - 总节点数: ${vectorizationResult.totalNodes}`);
        console.log(`  - 向量化成功: ${vectorizationResult.vectorizedNodes}`);
        console.log(`  - 跳过节点: ${vectorizationResult.skippedNodes}`);
        console.log(`  - 向量维度: ${vectorizationResult.dimension}`);
        console.log(`  - 集合名称: ${vectorizationResult.collectionName}`);
        console.log(`  - 处理时间: ${vectorizationResult.processingTime}ms`);

        // 5. 测试语义搜索
        console.log('\n🔍 测试语义搜索...');
        const searchQueries = [
            '用户登录认证',
            '数据模型定义',
            'API路由配置',
            '前端表单组件'
        ];

        for (const query of searchQueries) {
            console.log(`\n查询: "${query}"`);
            try {
                const searchResults = await vectorizer.searchSimilarNodes(
                    query,
                    undefined,
                    { topK: 3 }
                );

                if (searchResults.length > 0) {
                    searchResults.forEach((result, index) => {
                        const doc = result.document;
                        const score = (result.score * 100).toFixed(1);
                        console.log(`  ${index + 1}. ${doc.elementName} (${score}%)`);
                        console.log(`     类型: ${doc.elementType} | 文件: ${doc.fileName}`);
                        console.log(`     内容: ${doc.content.substring(0, 60)}...`);
                    });
                } else {
                    console.log('  未找到相关结果');
                }
            } catch (error) {
                console.error(`  搜索失败: ${error.message}`);
            }
        }

        // 6. 测试按类型搜索
        console.log('\n🏷️ 测试按类型搜索...');
        try {
            const functionResults = await vectorizer.searchByElementType('function', undefined, 5);
            console.log(`函数类型节点: ${functionResults.length} 个`);
            
            const componentResults = await vectorizer.searchByElementType('component', undefined, 5);
            console.log(`组件类型节点: ${componentResults.length} 个`);
        } catch (error) {
            console.error(`按类型搜索失败: ${error.message}`);
        }

        // 7. 获取统计信息
        console.log('\n📊 获取统计信息...');
        try {
            const stats = await vectorizer.getVectorDBStats();
            console.log(`集合名称: ${stats.collectionName}`);
            console.log(`文档总数: ${stats.totalDocuments}`);
        } catch (error) {
            console.error(`获取统计信息失败: ${error.message}`);
        }

        console.log('\n✅ 所有测试通过！Milvus 向量化功能工作正常。');

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
        await testMilvusVectorization();
        console.log('\n🎉 Milvus 向量化功能测试完成！');
        console.log('\n💡 使用建议:');
        console.log('1. 确保 Milvus 服务运行正常');
        console.log('2. 配置正确的 Embedding API 地址');
        console.log('3. 根据项目规模调整批处理大小');
        console.log('4. 定期备份向量数据库');
    } catch (error) {
        console.error('\n💥 测试失败:', error);
        process.exit(1);
    }
}

// 执行测试
if (require.main === module) {
    runTests();
}

module.exports = { testMilvusVectorization };