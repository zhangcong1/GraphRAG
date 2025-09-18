<template>
  <div class="product-item">
    <div class="product-image">
      <img :src="cartItem.product.image" :alt="cartItem.product.name" />
    </div>
    
    <div class="product-info">
      <h3 class="product-name">{{ cartItem.product.name }}</h3>
      <p class="product-category">{{ cartItem.product.category }}</p>
      <p v-if="cartItem.product.description" class="product-description">
        {{ cartItem.product.description }}
      </p>
      
      <!-- 商品选项 -->
      <div v-if="cartItem.selectedOptions && cartItem.selectedOptions.length > 0" class="product-options">
        <span v-for="option in cartItem.selectedOptions" :key="option.type" class="option-tag">
          {{ option.type }}: {{ option.value }}
        </span>
      </div>
    </div>
    
    <div class="product-controls">
      <div class="price-info">
        <span class="unit-price">{{ formatPrice(getItemPrice()) }}</span>
        <span class="total-price">总计: {{ formatPrice(getItemTotal()) }}</span>
      </div>
      
      <div class="quantity-controls">
        <button 
          @click="decreaseQuantity" 
          :disabled="cartItem.quantity <= 1"
          class="qty-btn"
        >
          -
        </button>
        <input 
          v-model.number="localQuantity"
          @blur="updateQuantity"
          @keyup.enter="updateQuantity"
          type="number"
          min="1"
          max="99"
          class="quantity-input"
        />
        <button @click="increaseQuantity" class="qty-btn">+</button>
      </div>
      
      <button @click="removeItem" class="remove-btn" title="移除商品">
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CartItem } from '../types/cart';
import { formatPrice } from '../utils/cartUtils';

// Props
interface Props {
  cartItem: CartItem;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  updateQuantity: [productId: number, quantity: number];
  removeItem: [productId: number];
}>();

// 本地数量状态（用于输入框）
const localQuantity = ref(props.cartItem.quantity);

// 计算属性
const getItemPrice = computed(() => {
  const basePrice = props.cartItem.product.price;
  const optionsPrice = props.cartItem.selectedOptions?.reduce(
    (sum, option) => sum + (option.priceModifier || 0), 0
  ) || 0;
  return basePrice + optionsPrice;
});

const getItemTotal = computed(() => {
  return getItemPrice.value * props.cartItem.quantity;
});

// 方法
const increaseQuantity = () => {
  localQuantity.value++;
  updateQuantity();
};

const decreaseQuantity = () => {
  if (localQuantity.value > 1) {
    localQuantity.value--;
    updateQuantity();
  }
};

const updateQuantity = () => {
  // 验证数量
  if (localQuantity.value < 1) {
    localQuantity.value = 1;
  } else if (localQuantity.value > 99) {
    localQuantity.value = 99;
  }
  
  if (localQuantity.value !== props.cartItem.quantity) {
    emit('updateQuantity', props.cartItem.product.id, localQuantity.value);
  }
};

const removeItem = () => {
  if (confirm(`确定要移除 ${props.cartItem.product.name} 吗？`)) {
    emit('removeItem', props.cartItem.product.id);
  }
};

// 监听props变化，同步本地数量
watch(() => props.cartItem.quantity, (newQuantity) => {
  localQuantity.value = newQuantity;
});
</script>

<style scoped>
.product-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 10px;
  background: white;
}

.product-image {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.product-category {
  margin: 0 0 5px 0;
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
}

.product-description {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #555;
  line-height: 1.4;
}

.product-options {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.option-tag {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #666;
}

.product-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  min-width: 120px;
}

.price-info {
  text-align: right;
}

.unit-price {
  display: block;
  font-size: 14px;
  color: #666;
}

.total-price {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.qty-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #666;
}

.qty-btn:hover {
  background: #e0e0e0;
}

.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity-input {
  width: 40px;
  height: 30px;
  border: none;
  text-align: center;
  font-size: 14px;
  background: white;
}

.quantity-input:focus {
  outline: none;
}

.remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: #ff4757;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.remove-btn:hover {
  background: #ff3742;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .product-item {
    flex-direction: column;
  }
  
  .product-controls {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>