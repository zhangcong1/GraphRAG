# 安装和使用指南

## 快速开始

### 1. 安装依赖

```bash
# 确保已安装 Node.js (推荐版本 18+)
node --version

# 安装项目依赖
npm install
```

### 2. 编译项目

```bash
# 编译 TypeScript 代码
npm run compile

# 或者启用监听模式（开发时推荐）
npm run watch
```

### 3. 运行插件

#### 方法 1: 在 VSCode 中调试
1. 在 VSCode 中打开本项目
2. 按 `F5` 启动调试模式
3. 这会打开一个新的 "Extension Development Host" 窗口
4. 在新窗口中打开一个前端项目作为测试工作区

#### 方法 2: 打包安装
```bash
# 安装 vsce (如果还没有安装)
npm install -g vsce

# 打包插件
vsce package

# 在 VSCode 中安装生成的 .vsix 文件
# Extensions -> ... -> Install from VSIX
```

### 4. 测试功能

1. **构建知识图谱**:
   - 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
   - 输入"构建知识图谱"并执行
   - 等待解析完成

2. **查看结果**:
   - 方法1: 直接查看生成的 `kg.json` 文件
   - 方法2: 使用"查看知识图谱"命令在 WebView 中查看

## 依赖说明

### 核心依赖
- `tree-sitter`: 代码解析引擎
- `tree-sitter-*`: 各语言解析器
- `@vue/compiler-sfc`: Vue 单文件组件编译器
- `glob`: 文件匹配工具

### 开发依赖
- `typescript`: TypeScript 编译器
- `@types/*`: 类型定义文件
- `eslint`: 代码检查工具

## 故障排除

### 常见问题

#### 1. 编译错误
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run compile
```

#### 2. Tree-sitter 模块错误
```bash
# 重新编译 native 模块
npm rebuild
```

#### 3. 插件无法加载
- 检查 VSCode 版本是否 >= 1.104.0
- 确保编译成功，存在 `out/` 目录

#### 4. 解析结果不完整
- 检查项目结构是否符合预期
- 查看 VSCode 输出面板中的错误信息
- 确认文件类型在支持列表中

### 日志调试

1. 打开 VSCode 输出面板
2. 选择 "GraphRAG" 通道
3. 查看详细的解析和构建日志

## 配置选项

### 支持的文件类型
可在 `src/fsUtils.ts` 中修改 `SUPPORTED_EXTENSIONS` 数组：

```typescript
export const SUPPORTED_EXTENSIONS = [
    '.vue', '.js', '.ts', '.jsx', '.tsx',
    '.json', '.md', '.html', '.css', '.scss'
];
```

### 排除模式
可在 `src/fsUtils.ts` 中修改 `EXCLUDE_PATTERNS` 数组：

```typescript
export const EXCLUDE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**'
];
```

## 开发指南

### 目录结构
```
src/
├── extension.ts    # 主扩展入口
├── parser.ts       # 代码解析器
├── graph.ts        # 图构建器
├── fsUtils.ts      # 文件系统工具
└── test/           # 测试文件
```

### 添加新语言支持

1. 安装对应的 tree-sitter 解析器
2. 在 `parser.ts` 中注册新的语言解析器
3. 实现对应的解析逻辑
4. 更新 `SUPPORTED_EXTENSIONS` 配置

### 扩展关系类型

1. 在 `graph.ts` 中扩展 `RelationType` 枚举
2. 在 `GraphBuilder` 类中添加对应的关系构建逻辑
3. 更新 WebView 显示逻辑

## 性能优化

### 大型项目优化
- 增加更多排除模式以过滤不需要的文件
- 调整社区检测算法的参数
- 考虑分批处理文件

### 内存优化
- 对于大型代码片段，考虑只保存摘要而非完整内容
- 实现更精确的语义相似度计算以减少不必要的边

## 贡献

欢迎提交 Issue 和 Pull Request！

### 开发环境设置
1. Fork 项目
2. 克隆到本地
3. 运行 `npm install`
4. 创建功能分支
5. 进行开发和测试
6. 提交 PR

### 代码规范
- 使用 TypeScript
- 遵循 ESLint 规则
- 添加适当的注释
- 为新功能编写测试