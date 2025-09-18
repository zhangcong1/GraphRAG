# GraphRAG Knowledge Graph Extension

基于 Tree-sitter 的前端代码知识图谱构建 VSCode 插件。该插件能够扫描前端工程（Vue、JavaScript、TypeScript等），解析代码结构，构建知识图谱并输出JSON格式的分析结果。

## 功能特性

### 🔍 多文件类型支持
- **Vue 文件**: 支持 Vue2 Option API 和 Vue3 Composition API
- **JavaScript/TypeScript**: 函数、类、变量、接口等
- **JSON**: 配置文件解析
- **Markdown**: 文档结构提取

### 🎯 代码实体识别
- **Vue2 Option API**: data、methods、computed、watch、props、components、生命周期等
- **Vue3 Composition API**: ref、reactive、computed、watch、defineComponent等
- **通用代码元素**: 函数、类、变量、接口、导入导出等

### 🌐 知识图谱构建
- **节点类型**: 文件、目录、代码实体
- **关系类型**: CONTAINS、DEFINED_IN、IMPORTS、EXPORTS、CALLS、RELATED_TO等
- **社区检测**: 基于连通组件的代码模块聚类分析
- **语义标签**: 自动生成的语义标识

### 📊 可视化展示
- **统计信息**: 文件数量、实体数量、关系数量、社区数量
- **社区分析**: 代码模块的聚类结果和描述
- **WebView界面**: 在VSCode中直接查看分析结果

## 安装依赖

### 必需依赖
```bash
npm install
```

插件依赖以下核心包：
- `tree-sitter`: 代码解析引擎
- `tree-sitter-javascript`: JavaScript解析器
- `tree-sitter-typescript`: TypeScript解析器  
- `tree-sitter-vue`: Vue文件解析器
- `tree-sitter-json`: JSON解析器
- `@vue/compiler-sfc`: Vue单文件组件编译器
- `glob`: 文件匹配工具

### 开发依赖
```bash
# 如果需要开发或调试
npm install --dev
```

## 使用方法

### 1. 安装插件
1. 克隆项目到本地
2. 运行 `npm install` 安装依赖
3. 在VSCode中按 `F5` 启动调试模式
4. 在新打开的Extension Development Host窗口中使用插件

### 2. 构建知识图谱
1. 在VSCode中打开前端项目工作区
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac) 打开命令面板
3. 输入 "构建知识图谱" 并执行命令
4. 等待解析完成，插件会显示进度条
5. 完成后会在工作区根目录生成 `kg.json` 文件

### 3. 查看结果
- **方式1**: 直接打开生成的 `kg.json` 文件查看原始数据
- **方式2**: 使用 "查看知识图谱" 命令在WebView中查看可视化结果

## 输出格式

生成的 `kg.json` 文件包含以下结构：

```json
{
  "nodes": [
    {
      "id": "entity:src/components/HelloWorld.vue:component:HelloWorld:1",
      "type": "entity",
      "name": "HelloWorld",
      "path": "/path/to/file.vue",
      "entity": {
        "file_path": "/absolute/path/to/file.vue",
        "file_name": "HelloWorld.vue",
        "start_line": 1,
        "end_line": 50,
        "element_type": "component",
        "name": "HelloWorld",
        "code_snippet": "<template>...",
        "semantic_tags": ["vue", "component", "frontend"]
      },
      "properties": {
        "element_type": "component",
        "start_line": 1,
        "end_line": 50,
        "language": "vue",
        "semantic_tags": ["vue", "component", "frontend"]
      }
    }
  ],
  "edges": [
    {
      "id": "file:src/components/HelloWorld.vue->entity:...:CONTAINS",
      "source": "file:src/components/HelloWorld.vue",
      "target": "entity:src/components/HelloWorld.vue:component:HelloWorld:1",
      "relation": "CONTAINS",
      "weight": 1.0,
      "properties": {}
    }
  ],
  "communities": [
    {
      "id": "community_1",
      "nodes": ["node_id_1", "node_id_2"],
      "score": 0.85,
      "description": "主要包含 5 个 component 的社区",
      "tags": ["vue", "component", "frontend"]
    }
  ],
  "metadata": {
    "version": "1.0.0",
    "created_at": "2024-01-01T00:00:00.000Z",
    "total_files": 10,
    "total_entities": 50,
    "total_relationships": 120,
    "workspace_path": "/path/to/workspace"
  }
}
```

## 核心实现

### 解析器架构 (parser.ts)
- **TreeSitterParser类**: 主解析器，支持多种语言
- **Vue文件解析**: 使用 `@vue/compiler-sfc` 分离script、template、style
- **AST解析**: 基于Tree-sitter的语法树分析
- **语义标签生成**: 基于代码模式和命名的智能标签

### 图构建 (graph.ts)
- **GraphBuilder类**: 知识图谱构建器
- **多层关系**: 文件->目录、实体->文件、函数调用、语义相似等
- **社区检测**: 连通组件算法识别代码模块
- **相似度计算**: 基于语义标签、路径、命名的多维相似度

### 文件系统 (fsUtils.ts)
- **智能扫描**: 支持glob模式的文件过滤
- **排除策略**: 自动排除node_modules、dist等目录
- **异步处理**: 高效的文件I/O操作

## 配置选项

### 支持的文件类型
```typescript
const SUPPORTED_EXTENSIONS = [
    '.vue', '.js', '.ts', '.jsx', '.tsx', 
    '.json', '.md', '.html', '.css', '.scss'
];
```

### 排除模式
```typescript
const EXCLUDE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**', 
    '**/build/**',
    '**/.git/**'
];
```

## 开发说明

### 项目结构
```
src/
├── extension.ts    # 主扩展逻辑
├── parser.ts       # 代码解析器
├── graph.ts        # 图构建器  
├── fsUtils.ts      # 文件系统工具
└── test/           # 测试文件
```

### 调试技巧
1. **启用详细日志**: 在输出面板查看"GraphRAG"日志
2. **断点调试**: 在Extension Development Host中使用调试器
3. **错误处理**: 检查解析错误和异常信息

### 扩展功能
- **添加新语言**: 在parser.ts中注册新的tree-sitter解析器
- **自定义关系**: 在graph.ts中扩展RelationType和关系构建逻辑
- **可视化增强**: 修改WebView模板添加图表和交互功能

## 常见问题

### Q: Tree-sitter模块加载失败
A: 确保已正确安装所有依赖，特别是native模块。可能需要重新编译：
```bash
npm rebuild
```

### Q: Vue文件解析不完整
A: 检查Vue文件的语法是否正确，插件会跳过有语法错误的文件。

### Q: 生成的图谱过大
A: 可以通过修改EXCLUDE_PATTERNS排除更多文件，或调整社区检测的阈值。

### Q: 社区检测结果不理想
A: 可以调整语义相似度的计算权重，或修改社区检测算法的参数。

## 贡献指南

1. Fork项目
2. 创建特性分支: `git checkout -b feature/your-feature`
3. 提交更改: `git commit -am 'Add some feature'`
4. 推送分支: `git push origin feature/your-feature`
5. 提交Pull Request

## 许可证

MIT License - 详见 LICENSE 文件

## 更新日志

### v0.0.1
- 初始版本发布
- 支持Vue2/3、JavaScript、TypeScript文件解析
- 基础知识图谱构建和社区检测
- WebView可视化界面
