# Vue购物车组件示例 - 知识图谱关联关系分析

## 📁 项目结构
```
test-demo/
├── types/
│   └── cart.ts                 # TypeScript类型定义
├── utils/
│   ├── apiService.ts          # API服务类
│   └── cartUtils.ts           # 购物车工具函数
└── components/
    ├── ShoppingCart.vue       # 主购物车组件
    ├── ProductItem.vue        # 商品项组件
    └── CartSummary.vue        # 购物车摘要组件
```

## 🎯 预期的实体和关系

### 实体类型 (Entities)

#### 1. **目录实体 (Directory)**
- `test-demo/` - 根目录
- `test-demo/types/` - 类型定义目录
- `test-demo/utils/` - 工具函数目录
- `test-demo/components/` - Vue组件目录

#### 2. **文件实体 (File)**
- `cart.ts` - TypeScript类型定义文件
- `apiService.ts` - API服务文件
- `cartUtils.ts` - 工具函数文件
- `ShoppingCart.vue` - 主购物车组件文件
- `ProductItem.vue` - 商品项组件文件
- `CartSummary.vue` - 购物车摘要组件文件

#### 3. **代码实体 (CodeEntity)**

**TypeScript接口/类型:**
- `Product` - 产品接口
- `CartItem` - 购物车项接口
- `ProductOption` - 产品选项接口
- `CartSummary` - 购物车摘要接口
- `User` - 用户接口
- `UserPreferences` - 用户偏好接口
- `CartAction` - 购物车动作类型

**TypeScript类:**
- `ApiService` - API服务类

**TypeScript函数:**
- `calculateCartTotal()` - 计算购物车总金额
- `addToCart()` - 添加商品到购物车
- `removeFromCart()` - 从购物车移除商品
- `updateQuantity()` - 更新商品数量
- `getItemQuantity()` - 获取商品数量
- `clearCart()` - 清空购物车
- `formatPrice()` - 格式化价格
- `checkAvailability()` - 检查库存
- `applyDiscount()` - 应用折扣
- `validateCart()` - 验证购物车

**Vue组件:**
- `ShoppingCart` - 主购物车组件
- `ProductItem` - 商品项组件
- `CartSummary` - 购物车摘要组件

**Vue组合式API函数:**
- `handleUpdateQuantity()` - 处理数量更新
- `handleRemoveItem()` - 处理移除商品
- `clearAllItems()` - 清空所有商品
- `handleApplyDiscount()` - 处理应用折扣
- `handleCheckout()` - 处理结算

### 关联关系 (Relationships)

#### 1. **CONTAINS 关系** (目录包含文件)
- `test-demo/` → `types/` (目录包含子目录)
- `test-demo/` → `utils/` (目录包含子目录)
- `test-demo/` → `components/` (目录包含子目录)
- `types/` → `cart.ts` (目录包含文件)
- `utils/` → `apiService.ts` (目录包含文件)
- `utils/` → `cartUtils.ts` (目录包含文件)
- `components/` → `ShoppingCart.vue` (目录包含文件)
- `components/` → `ProductItem.vue` (目录包含文件)
- `components/` → `CartSummary.vue` (目录包含文件)

#### 2. **DEFINED_IN 关系** (代码实体定义在文件中)
- `Product` → `cart.ts`
- `CartItem` → `cart.ts`
- `ApiService` → `apiService.ts`
- `calculateCartTotal` → `cartUtils.ts`
- `ShoppingCart` → `ShoppingCart.vue`
- `ProductItem` → `ProductItem.vue`
- `CartSummary` → `CartSummary.vue`

#### 3. **IMPORTS 关系** (文件导入依赖)
- `apiService.ts` → `cart.ts` (导入类型定义)
- `cartUtils.ts` → `cart.ts` (导入类型定义)
- `ShoppingCart.vue` → `cart.ts` (导入类型定义)
- `ShoppingCart.vue` → `cartUtils.ts` (导入工具函数)
- `ShoppingCart.vue` → `apiService.ts` (导入API服务)
- `ShoppingCart.vue` → `ProductItem.vue` (导入子组件)
- `ShoppingCart.vue` → `CartSummary.vue` (导入子组件)
- `ProductItem.vue` → `cart.ts` (导入类型定义)
- `ProductItem.vue` → `cartUtils.ts` (导入工具函数)
- `CartSummary.vue` → `cart.ts` (导入类型定义)
- `CartSummary.vue` → `cartUtils.ts` (导入工具函数)

#### 4. **EXPORTS 关系** (文件导出内容)
- `cart.ts` → `Product`, `CartItem`, `CartSummary`, `User`, `CartAction`
- `apiService.ts` → `ApiService`, `apiService`
- `cartUtils.ts` → `calculateCartTotal`, `addToCart`, `removeFromCart`, etc.

#### 5. **CALLS 关系** (函数调用)
- `ShoppingCart.vue` 调用 `calculateCartTotal()`
- `ShoppingCart.vue` 调用 `addToCart()`
- `ShoppingCart.vue` 调用 `apiService.saveCart()`
- `ShoppingCart.vue` 调用 `apiService.loadCart()`
- `ProductItem.vue` 调用 `formatPrice()`
- `CartSummary.vue` 调用 `formatPrice()`
- `CartSummary.vue` 调用 `applyDiscountUtil()`

#### 6. **RELATED_TO 关系** (基于语义标签的关联)
- 所有Vue文件通过 `vue`, `component`, `frontend` 标签关联
- 所有TypeScript文件通过 `typescript`, `type-definition` 标签关联
- 购物车相关函数通过 `cart`, `e-commerce`, `shopping` 标签关联
- API相关函数通过 `api`, `service`, `http` 标签关联

## 🔍 预期知识图谱特征

### 节点类型分布:
- **目录节点**: 4个 (test-demo, types, utils, components)
- **文件节点**: 6个 (所有.ts和.vue文件)
- **代码实体节点**: 约30-40个 (接口、类、函数、组件等)

### 关系分布:
- **CONTAINS**: 约10条边 (目录-文件关系)
- **DEFINED_IN**: 约30-40条边 (实体-文件关系)
- **IMPORTS**: 约12条边 (文件间导入关系)
- **EXPORTS**: 约20条边 (文件导出关系)
- **CALLS**: 约15条边 (函数调用关系)
- **RELATED_TO**: 约25条边 (基于标签的语义关联)

### 核心连接点:
- `cart.ts` - 作为类型定义中心，被多个文件导入
- `cartUtils.ts` - 作为工具函数中心，被多个组件调用
- `ShoppingCart.vue` - 作为主组件，导入最多依赖
- `apiService.ts` - 作为数据服务中心

## 🎨 可视化预期效果

在D3.js知识图谱中，应该能看到：
1. **分层结构**: 目录在上层，文件在中层，代码实体在下层
2. **导入关系网络**: `cart.ts`作为中心被多个文件引用
3. **组件关系**: Vue组件之间的父子关系
4. **功能聚类**: 相同功能的代码实体会聚集在一起
5. **跨文件调用**: 可以追踪函数调用链路

通过这个示例，我们可以验证知识图谱解析器是否能正确识别和构建这些复杂的关联关系。