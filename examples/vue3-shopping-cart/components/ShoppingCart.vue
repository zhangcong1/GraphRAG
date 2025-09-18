<template>
  <div class="shopping-cart">
    <div class="cart-header">
      <h2>购物车 ({{ cartSummary.totalItems }}件商品)</h2>
      <button v-if="cartItems.length > 0" @click="clearAllItems" class="clear-btn">
        清空购物车
      </button>
    </div>
    
    <div v-if="cartItems.length === 0" class="empty-cart">
      <p>您的购物车还是空的</p>
      <button @click="goToProducts" class="shop-btn">去购物</button>
    </div>
    
    <div v-else class="cart-content">
      <!-- 商品列表 -->
      <div class="cart-items">
        <ProductItem
          v-for="item in cartItems"
          :key="`${item.product.id}-${getOptionsKey(item.selectedOptions)}`"
          :cart-item="item"
          @update-quantity="handleUpdateQuantity"
          @remove-item="handleRemoveItem"
        />
      </div>
      
      <!-- 购物车摘要 -->
      <CartSummary 
        :summary="cartSummary"
        :discount-code="discountCode"
        @apply-discount="handleApplyDiscount"
        @checkout="handleCheckout"
      />
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <p>处理中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { CartItem, CartSummary as CartSummaryType } from '../types/cart';
import { 
  calculateCartTotal, 
  addToCart, 
  removeFromCart, 
  updateQuantity,
  clearCart,
  validateCart,
  formatPrice
} from '../utils/cartUtils';
import { apiService } from '../utils/apiService';
import ProductItem from './ProductItem.vue';
import CartSummary from './CartSummary.vue';

// Props
interface Props {
  userId?: number;
  currency?: string;
}

const props = withDefaults(defineProps<Props>(), {
  userId: 1,
  currency: '¥'
});

// Emits
const emit = defineEmits<{
  checkout: [items: CartItem[], summary: CartSummaryType];
  cartUpdated: [items: CartItem[]];
}>();

// 响应式数据
const cartItems = ref<CartItem[]>([]);
const loading = ref(false);
const discountCode = ref('');
const error = ref('');

// 计算属性
const cartSummary = computed(() => calculateCartTotal(cartItems.value));

const isCartValid = computed(() => {
  const validation = validateCart(cartItems.value);
  return validation.isValid;
});

// 方法
const handleUpdateQuantity = async (productId: number, newQuantity: number) => {
  try {
    loading.value = true;
    cartItems.value = updateQuantity(cartItems.value, productId, newQuantity);
    await saveCartToServer();
    emit('cartUpdated', cartItems.value);
  } catch (err) {
    error.value = '更新数量失败';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleRemoveItem = async (productId: number) => {
  try {
    loading.value = true;
    cartItems.value = removeFromCart(cartItems.value, productId);
    await saveCartToServer();
    emit('cartUpdated', cartItems.value);
  } catch (err) {
    error.value = '移除商品失败';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const clearAllItems = async () => {
  if (confirm('确定要清空购物车吗？')) {
    try {
      loading.value = true;
      cartItems.value = clearCart();
      await saveCartToServer();
      emit('cartUpdated', cartItems.value);
    } catch (err) {
      error.value = '清空购物车失败';
      console.error(err);
    } finally {
      loading.value = false;
    }
  }
};

const handleApplyDiscount = (code: string) => {
  discountCode.value = code;
  // 这里可以调用API验证折扣码
  console.log('应用折扣码:', code);
};

const handleCheckout = () => {
  if (!isCartValid.value) {
    error.value = '购物车中有无效商品，请检查';
    return;
  }
  
  emit('checkout', cartItems.value, cartSummary.value);
};

const goToProducts = () => {
  // 导航到商品页面的逻辑
  console.log('导航到商品页面');
};

const saveCartToServer = async () => {
  try {
    await apiService.saveCart(props.userId, cartItems.value);
  } catch (err) {
    console.warn('保存购物车到服务器失败:', err);
  }
};

const loadCartFromServer = async () => {
  try {
    loading.value = true;
    const items = await apiService.loadCart(props.userId);
    cartItems.value = items;
  } catch (err) {
    error.value = '加载购物车失败';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const getOptionsKey = (options: any[]) => {
  return options ? JSON.stringify(options) : '';
};

// 生命周期
onMounted(() => {
  loadCartFromServer();
});

// 监听器
watch(cartItems, (newItems) => {
  // 自动保存到本地存储
  localStorage.setItem(`cart_${props.userId}`, JSON.stringify(newItems));
}, { deep: true });

// 导出组合式API（供其他组件使用）
defineExpose({
  addItem: (item: CartItem) => {
    cartItems.value = addToCart(cartItems.value, item);
  },
  getCartSummary: () => cartSummary.value,
  getCartItems: () => cartItems.value
});
</script>

<style scoped>
.shopping-cart {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.clear-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.empty-cart {
  text-align: center;
  padding: 40px;
}

.shop-btn {
  background: #3742fa;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.cart-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.cart-items {
  space-y: 10px;
}

.loading {
  text-align: center;
  padding: 20px;
}

@media (max-width: 768px) {
  .cart-content {
    grid-template-columns: 1fr;
  }
}
</style>