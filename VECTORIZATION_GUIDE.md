# 知识图谱向量化功能使用指南

## 功能概述

本插件为 GraphRAG 知识图谱添加了向量化功能，支持将知识图谱节点转换为向量表示并存储在本地向量数据库中，实现基于语义的代码搜索。

## 主要功能

### 1. 自动向量化
- 在构建知识图谱时自动将代码节点向量化
- 支持多种代码元素类型（函数、类、接口、变量等）
- 生成语义化的向量表示

### 2. 本地向量数据库
- 每个项目独立的向量数据库文件
- 存储在项目的 `.huima/vector-database.json` 文件中
- 支持多个集合（collection）管理

### 3. 语义搜索
- 基于向量相似性的代码搜索
- 支持自然语言查询
- 返回相关度排序的结果

### 4. 批量搜索
- 支持多个查询一次性执行
- 生成搜索报告
- 便于代码分析和理解

## 使用方法

### 配置 Embedding 服务

在 VS Code 设置中配置 Embedding 模型服务：

```json
{
  "graphrag.enableVectorization": true,
  "graphrag.embeddingApiUrl": "http://10.30.235.27:46600",
  "graphrag.embeddingModel": "Qwen3-Embedding-8B",
  "graphrag.searchTopK": 10,
  "graphrag.searchThreshold": 0.5
}
```

### 1. 构建知识图谱并向量化

1. 打开要分析的项目
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "构建知识图谱" 并执行
4. 插件会自动构建知识图谱并进行向量化

### 2. 搜索知识图谱

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "搜索知识图谱" 并执行
3. 输入搜索查询，例如：
   - "用户认证功能"
   - "数据库操作"
   - "API接口定义"
   - "前端组件渲染"
4. 选择搜索结果查看详情

### 3. 批量搜索

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "批量搜索知识图谱" 并执行
3. 输入多个查询，每行一个：
   ```
   用户认证
   数据库操作
   API接口
   前端组件
   ```
4. 查看生成的搜索报告

## 文件结构

向量化功能会在项目中创建以下文件：

```
.huima/
├── kg.json                          # 知识图谱文件（包含向量化信息）
├── kg_summary.json                  # 知识图谱摘要
├── vector-database.json             # 向量数据库
└── vectorization-test-report.md     # 测试报告（如果运行过测试）
```

## API 说明

### EmbeddingService

负责调用 Embedding 模型获取文本向量：

```typescript
const embeddingService = new EmbeddingService({
    apiUrl: 'http://10.30.235.27:46600',
    model: 'Qwen3-Embedding-8B'
});

const embeddings = await embeddingService.getEmbeddings(texts);
```

### LocalVectorDB

本地向量数据库管理：

```typescript
const vectorDB = new LocalVectorDB(projectPath);

// 创建集合
vectorDB.createCollection('knowledge_graph', 128);

// 插入文档
vectorDB.insert('knowledge_graph', documents);

// 搜索
const results = vectorDB.search('knowledge_graph', queryVector, { topK: 10 });
```

### KnowledgeGraphVectorizer

知识图谱向量化器：

```typescript
const vectorizer = new KnowledgeGraphVectorizer(projectPath);

// 向量化知识图谱
const result = await vectorizer.vectorizeKnowledgeGraph(nodes, 'knowledge_graph');

// 搜索相似节点
const searchResults = await vectorizer.searchSimilarNodes(query, 'knowledge_graph');
```

## 配置选项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `graphrag.enableVectorization` | boolean | true | 启用向量化功能 |
| `graphrag.embeddingApiUrl` | string | http://10.30.235.27:46600 | Embedding API 地址 |
| `graphrag.embeddingModel` | string | Qwen3-Embedding-8B | 模型名称 |
| `graphrag.searchTopK` | number | 10 | 搜索返回结果数量 |
| `graphrag.searchThreshold` | number | 0.5 | 相似度阈值 |

## 故障排除

### 1. Embedding API 连接失败

**症状：** 构建时显示 "Embedding API 调用失败，使用模拟数据"

**解决方法：**
- 检查 API 地址配置是否正确
- 确认网络连接正常
- 验证 API 服务是否运行

### 2. 向量数据库文件损坏

**症状：** 搜索时提示 "向量数据库加载失败"

**解决方法：**
- 删除 `.huima/vector-database.json` 文件
- 重新构建知识图谱

### 3. 搜索结果不准确

**解决方法：**
- 调整 `searchThreshold` 配置
- 增加 `searchTopK` 数量
- 重新向量化知识图谱

## 性能优化

### 1. 批处理设置

对于大型项目，可以调整批处理大小：

```typescript
const vectorizer = new KnowledgeGraphVectorizer(projectPath, embeddingConfig, {
    batchSize: 20  // 增加批处理大小
});
```

### 2. 选择性向量化

只向量化特定文件的节点：

```typescript
const fileNodes = nodes.filter(node => 
    node.file_path && targetFiles.includes(node.file_path)
);
await vectorizer.vectorizeKnowledgeGraph(fileNodes);
```

### 3. 定期清理

定期清理向量数据库以保持性能：

```typescript
vectorDB.dropCollection('old_collection');
```

## 扩展功能

### 1. 自定义 Embedding 服务

实现自定义的 Embedding 服务：

```typescript
class CustomEmbeddingService extends EmbeddingService {
    async getRealEmbeddings(texts: string[]): Promise<number[][]> {
        // 自定义实现
    }
}
```

### 2. 向量化配置

自定义向量化行为：

```typescript
const config = {
    includeSemanticTags: true,
    includeMetadata: true,
    useSimulation: false
};
```

## 支持的文件类型

- JavaScript/TypeScript (.js, .ts, .jsx, .tsx)
- Vue 单文件组件 (.vue)
- JSON 配置文件 (.json)
- Python (.py)
- Java (.java)
- Go (.go)
- Rust (.rs)

## 更新日志

### v1.0.0
- 首次发布向量化功能
- 支持本地向量数据库
- 实现语义搜索
- 添加批量搜索功能

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进向量化功能：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

本项目遵循 MIT 许可证。