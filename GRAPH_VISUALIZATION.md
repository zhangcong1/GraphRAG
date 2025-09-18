# 知识图谱可视化功能说明

## 功能概述

本项目已成功实现了知识图谱的构建和基于D3.js的可视化展示功能。知识图谱数据将保存在项目的`.huima`目录下，并提供交互式的图形化界面进行查看。

## 主要改进

### 1. 数据存储位置
- **变更**: 知识图谱JSON文件现在保存到`.huima`目录而不是工作区根目录
- **文件结构**:
  ```
  .huima/
  ├── kg.json           # 完整的知识图谱数据
  └── kg_summary.json   # 图谱摘要数据（用于快速预览）
  ```

### 2. D3.js可视化界面
- **交互式图形**: 使用D3.js力导向图展示节点和边的关系
- **节点类型区分**: 
  - 🔴 文件节点 (红色圆圈)
  - 🟢 目录节点 (绿色圆圈)
  - 🔵 代码实体节点 (蓝色圆圈)
- **功能特性**:
  - 拖拽节点进行交互
  - 鼠标悬停显示详细信息
  - 缩放和平移视图
  - 暂停/继续物理模拟
  - 重置视图位置

### 3. 侧边栏信息面板
- **图谱统计**: 显示节点数、边数、文件数等统计信息
- **类型图例**: 展示不同节点类型的颜色含义和数量
- **响应式布局**: 主视图区域和侧边栏的合理分配

## 使用方法

### 1. 开发环境启动
```bash
# 安装依赖
npm install

# 编译项目
npm run compile

# 启动VS Code调试模式
# 方法一：在VS Code中按 F5
# 方法二：在命令面板中运行 "Debug: Start Debugging"
```

### 2. 构建知识图谱
1. 在VS Code扩展调试窗口中，打开要分析的项目
2. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux) 打开命令面板
3. 输入并选择 "构建知识图谱"
4. 等待扫描和解析完成
5. 在提示框中选择 "查看图谱" 或 "打开文件"

### 3. 查看图谱可视化
1. 如果已有知识图谱数据，可直接使用命令 "查看知识图谱"
2. 系统会打开一个新的WebView标签页显示D3可视化界面
3. 可以通过以下方式交互：
   - **拖拽**: 移动节点位置
   - **滚轮**: 缩放视图
   - **悬停**: 查看节点详细信息
   - **右上角按钮**: 重置视图或暂停模拟运动

## 技术特性

### 文件扫描与过滤
- 支持多种文件类型：`.vue`, `.js`, `.ts`, `.jsx`, `.tsx`, `.json`, `.md`等
- 自动过滤：`node_modules`, `dist`, `build`, `.git`等目录
- 跳过二进制文件和压缩文件

### 知识图谱结构
```json
{
  "metadata": {
    "version": "1.0.0",
    "created_at": "2025-09-18T15:20:40.080Z",
    "total_files": 5,
    "total_entities": 10,
    "total_relationships": 8,
    "workspace_path": "/path/to/workspace"
  },
  "nodes": [
    {
      "id": "file:test.js",
      "type": "file|directory|entity",
      "name": "test.js",
      "path": "relative/path",
      "properties": { /* 节点属性 */ }
    }
  ],
  "edges": [
    {
      "id": "source->target:relation",
      "source": "source_node_id",
      "target": "target_node_id", 
      "relation": "CONTAINS|DEFINED_IN|IMPORTS|CALLS|RELATED_TO",
      "weight": 1.0
    }
  ],
  "communities": [
    {
      "id": "community_1",
      "nodes": ["node_id1", "node_id2"],
      "score": 0.8,
      "description": "社区描述",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### 关系类型说明
- **CONTAINS**: 目录包含文件，文件包含代码实体
- **DEFINED_IN**: 代码实体定义在文件中
- **IMPORTS**: 文件导入关系
- **CALLS**: 函数调用关系
- **RELATED_TO**: 基于语义标签的相关关系

## 依赖项

### 运行时依赖
- `tree-sitter`: 代码解析核心
- `tree-sitter-*`: 各语言解析器
- `@vue/compiler-sfc`: Vue单文件组件解析
- `glob`: 文件模式匹配
- `d3`: 可视化图形库

### 开发依赖
- `@types/vscode`: VS Code API类型定义
- `typescript`: TypeScript编译器
- `eslint`: 代码检查工具

## 注意事项

1. **首次使用**: 确保已安装所有依赖项
2. **大型项目**: 对于包含大量文件的项目，构建可能需要较长时间
3. **内存使用**: 复杂的图谱可能消耗较多内存
4. **浏览器兼容**: D3可视化需要现代浏览器支持

## 故障排除

### 常见问题
1. **构建失败**: 检查是否有语法错误的文件
2. **可视化不显示**: 确保网络连接正常（需要加载D3.js CDN）
3. **性能问题**: 可以通过暂停物理模拟来提高性能

### 调试模式
使用VS Code的开发者工具查看WebView的控制台输出：
1. 在可视化界面右键选择 "检查元素"
2. 查看Console标签页的错误信息

## 未来扩展

- [ ] 支持更多编程语言
- [ ] 添加图谱搜索和过滤功能
- [ ] 实现图谱数据的增量更新
- [ ] 支持自定义可视化主题
- [ ] 添加图谱分析报告生成