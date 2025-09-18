# Milvus 向量数据库安装配置指南

## 📋 概述

**Milvus** 是一个开源的向量数据库，专为AI和机器学习应用设计。本指南将帮助您在GraphRAG项目中安装、配置和使用Milvus。

## 🚀 快速安装 (推荐 Docker 方式)

### 方式一：Docker Compose (最简单)

1. **创建 docker-compose.yml 文件**

```yaml
version: '3.5'

services:
  etcd:
    container_name: milvus-etcd
    image: quay.io/coreos/etcd:v3.5.5
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
      - ETCD_SNAPSHOT_COUNT=50000
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/etcd:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:2379/health"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio:
    container_name: milvus-minio
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    ports:
      - "9001:9001"
      - "9000:9000"
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/minio:/minio_data
    command: minio server /minio_data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  milvus:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.4.0
    command: ["milvus", "run", "standalone"]
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - ${DOCKER_VOLUME_DIRECTORY:-.}/volumes/milvus:/var/lib/milvus
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9091/healthz"]
      interval: 30s
      start_period: 90s
      timeout: 20s
      retries: 3
    ports:
      - "19530:19530"
      - "9091:9091"
    depends_on:
      - "etcd"
      - "minio"

networks:
  default:
    name: milvus
```

2. **启动服务**

```bash
# 在包含 docker-compose.yml 的目录中执行
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs milvus
```

### 方式二：Docker 单容器 (简化版)

```bash
# 运行 Milvus 单机版
docker run -d \
  --name milvus-standalone \
  -p 19530:19530 \
  -p 9091:9091 \
  -v $(pwd)/volumes/milvus:/var/lib/milvus \
  milvusdb/milvus:v2.4.0 \
  milvus run standalone
```

## 🔗 连接配置

### 默认连接信息

安装完成后，Milvus的默认连接信息：

```javascript
const milvusConfig = {
  address: 'http://localhost:19530',  // Milvus 服务地址
  username: '',                        // 默认无用户名
  password: '',                        // 默认无密码
  ssl: false                          // 本地部署通常不需要SSL
}
```

### GraphRAG 项目配置

在VS Code中打开设置 (Ctrl+, 或 Cmd+,)，搜索 "graphrag"，设置以下配置：

```json
{
  "graphrag.milvusAddress": "http://localhost:19530",
  "graphrag.milvusUsername": "",
  "graphrag.milvusPassword": ""
}
```

或者直接修改 `.vscode/settings.json`：

```json
{
  "graphrag.enableVectorization": true,
  "graphrag.milvusAddress": "http://localhost:19530",
  "graphrag.milvusUsername": "",
  "graphrag.milvusPassword": "",
  "graphrag.embeddingApiUrl": "http://10.30.235.27:46600",
  "graphrag.embeddingModel": "Qwen3-Embedding-8B"
}
```

## 🔐 用户认证配置 (可选)

### 启用认证

如果需要启用用户认证，可以通过以下方式：

1. **修改 Milvus 配置文件** (milvus.yaml)

```yaml
# 认证配置
common:
  security:
    authorizationEnabled: true
```

2. **创建用户和密码**

```python
# 使用 Python SDK 创建用户
from pymilvus import connections, utility

# 连接到 Milvus
connections.connect("default", host="localhost", port="19530")

# 创建用户 (需要 root 权限)
utility.create_user(user="your_username", password="your_password")

# 授予权限
utility.create_role(role_name="your_role")
utility.add_user_to_role(username="your_username", role_name="your_role")
```

3. **更新 GraphRAG 配置**

```json
{
  "graphrag.milvusAddress": "http://localhost:19530",
  "graphrag.milvusUsername": "your_username",
  "graphrag.milvusPassword": "your_password"
}
```

## 🌐 云端部署选项

### Zilliz Cloud (推荐)

1. **注册账号**
   - 访问 [Zilliz Cloud](https://cloud.zilliz.com/signup)
   - 注册免费账号

2. **创建集群**
   - 选择 "Serverless" 获得免费额度
   - 复制公共端点和API密钥

3. **配置连接**

```json
{
  "graphrag.milvusAddress": "https://your-cluster-endpoint.zillizcloud.com:443",
  "graphrag.milvusUsername": "",
  "graphrag.milvusPassword": "",
  "graphrag.milvusToken": "your-zilliz-cloud-api-key"
}
```

### AWS/阿里云/腾讯云

也可以在各大云服务商上部署Milvus，具体参考官方文档。

## 🧪 测试连接

### 方式一：使用项目测试脚本

```bash
# 在项目根目录执行
node test-milvus-vectorization.js
```

### 方式二：Python 快速测试

```python
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType

# 连接测试
try:
    connections.connect("default", host="localhost", port="19530")
    print("✅ Milvus 连接成功!")
    
    # 列出所有集合
    from pymilvus import utility
    collections = utility.list_collections()
    print(f"现有集合: {collections}")
    
except Exception as e:
    print(f"❌ 连接失败: {e}")
```

### 方式三：使用 Attu (Milvus 管理界面)

```bash
# 启动 Attu 管理界面
docker run -d \
  --name attu \
  -p 3000:3000 \
  -e MILVUS_URL=http://localhost:19530 \
  zilliz/attu:latest

# 访问 http://localhost:3000
```

## 🔧 常见问题解决

### 1. 端口占用

```bash
# 检查端口占用
lsof -i :19530
netstat -tlnp | grep 19530

# 修改端口映射
docker run -p 19531:19530 ...
```

### 2. 内存不足

```bash
# 增加 Docker 内存限制
docker run --memory=4g milvusdb/milvus:latest
```

### 3. 数据持久化

```bash
# 确保数据卷映射正确
-v /path/to/your/data:/var/lib/milvus
```

### 4. 连接超时

```javascript
// 增加连接超时时间
const config = {
  address: 'localhost:19530',
  timeout: 30000  // 30秒超时
}
```

## 📊 性能优化建议

### 硬件要求

- **CPU**: 4核以上
- **内存**: 8GB以上 (推荐16GB)
- **存储**: SSD 推荐
- **网络**: 千兆网络

### 配置优化

```yaml
# milvus.yaml 优化配置
dataNode:
  flush:
    insertBufSize: 134217728  # 128MB
queryNode:
  cache:
    cacheSize: 2147483648    # 2GB
indexNode:
  scheduler:
    maxParallelism: 4
```

## 🔄 数据迁移

### 从本地向量数据库迁移到 Milvus

项目已经提供了自动迁移功能，只需要：

1. 确保 Milvus 正常运行
2. 更新配置指向 Milvus
3. 重新运行知识图谱构建命令

系统会自动使用新的Milvus存储。

## 📝 总结

- **开发环境**: 使用 Docker 单容器部署
- **生产环境**: 使用 Docker Compose 或云端服务
- **默认无认证**: 本地部署通常不需要用户名密码
- **连接地址**: `http://localhost:19530`
- **管理界面**: 使用 Attu 进行可视化管理

按照以上步骤，您就可以成功安装和配置Milvus向量数据库，并与GraphRAG项目集成使用了！

如果遇到问题，请检查Docker日志或联系技术支持。