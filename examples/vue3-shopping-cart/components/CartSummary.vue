<template>
  <div class="cart-summary">
    <h3>订单摘要</h3>
    
    <div class="summary-section">
      <div class="summary-row">
        <span>商品数量</span>
        <span>{{ summary.totalItems }} 件</span>
      </div>
      
      <div class="summary-row">
        <span>小计</span>
        <span>{{ formatPrice(summary.subtotal) }}</span>
      </div>
      
      <div class="summary-row">
        <span>税费</span>
        <span>{{ formatPrice(summary.tax) }}</span>
      </div>
      
      <div class="summary-row">
        <span>运费</span>
        <span v-if="summary.shipping === 0" class="free-shipping">免费</span>
        <span v-else>{{ formatPrice(summary.shipping) }}</span>
      </div>
      
      <div v-if="summary.discountAmount && summary.discountAmount > 0" class="summary-row discount">
        <span>折扣</span>
        <span>-{{ formatPrice(summary.discountAmount) }}</span>
      </div>
      
      <hr class="divider">
      
      <div class="summary-row total">
        <span>总计</span>
        <span>{{ formatPrice(summary.total) }}</span>
      </div>
    </div>
    
    <!-- 折扣码输入 -->
    <div class="discount-section">
      <h4>优惠码</h4>
      <div class="discount-input-group">
        <input 
          v-model="localDiscountCode"
          type="text"
          placeholder="请输入优惠码"
          class="discount-input"
          @keyup.enter="applyDiscount"
        />
        <button 
          @click="applyDiscount"
          :disabled="!localDiscountCode.trim()"
          class="apply-btn"
        >
          应用
        </button>
      </div>
      <p v-if="discountMessage" class="discount-message" :class="discountMessageType">
        {{ discountMessage }}
      </p>
    </div>
    
    <!-- 结算按钮 -->
    <div class="checkout-section">
      <button 
        @click="proceedToCheckout"
        :disabled="summary.totalItems === 0 || isProcessing"
        class="checkout-btn"
      >
        <span v-if="isProcessing">处理中...</span>
        <span v-else>结算 {{ formatPrice(summary.total) }}</span>
      </button>
      
      <p class="secure-checkout">
        🔒 安全结算
      </p>
    </div>
    
    <!-- 配送信息 -->
    <div class="shipping-info">
      <h4>配送信息</h4>
      <ul>
        <li v-if="summary.shipping === 0">✅ 满{{ formatPrice(100) }}免运费</li>
        <li v-else>📦 还差{{ formatPrice(100 - summary.subtotal) }}即可免运费</li>
        <li>🚚 预计2-3个工作日送达</li>
        <li>📍 支持全国大部分地区配送</li>
      </ul>
    </div>
    
    <!-- 支付方式 -->
    <div class="payment-methods">
      <h4>支持的支付方式</h4>
      <div class="payment-icons">
        <span class="payment-icon">💳</span>
        <span class="payment-icon">📱</span>
        <span class="payment-icon">🏦</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CartSummary } from '../types/cart';
import { formatPrice, applyDiscount as applyDiscountUtil } from '../utils/cartUtils';

// Props
interface Props {
  summary: CartSummary;
  discountCode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  discountCode: ''
});

// Emits
const emit = defineEmits<{
  applyDiscount: [code: string];
  checkout: [];
}>();

// 响应式数据
const localDiscountCode = ref(props.discountCode);
const discountMessage = ref('');
const discountMessageType = ref<'success' | 'error' | ''>('');
const isProcessing = ref(false);

// 已知的优惠码（模拟数据）
const validDiscountCodes = {
  'SAVE10': { percent: 10, description: '10% 折扣' },
  'WELCOME': { percent: 5, description: '新用户 5% 折扣' },
  'FREESHIP': { freeShipping: true, description: '免运费' }
};

// 方法
const applyDiscount = () => {
  const code = localDiscountCode.value.trim().toUpperCase();
  
  if (!code) {
    discountMessage.value = '请输入优惠码';
    discountMessageType.value = 'error';
    return;
  }
  
  if (validDiscountCodes[code as keyof typeof validDiscountCodes]) {
    const discount = validDiscountCodes[code as keyof typeof validDiscountCodes];
    discountMessage.value = `优惠码生效：${discount.description}`;
    discountMessageType.value = 'success';
    emit('applyDiscount', code);
  } else {
    discountMessage.value = '无效的优惠码';
    discountMessageType.value = 'error';
  }
  
  // 3秒后清除消息
  setTimeout(() => {
    discountMessage.value = '';
    discountMessageType.value = '';
  }, 3000);
};

const proceedToCheckout = () => {
  if (props.summary.totalItems === 0) {
    return;
  }
  
  isProcessing.value = true;
  
  // 模拟处理延迟
  setTimeout(() => {
    isProcessing.value = false;
    emit('checkout');
  }, 1000);
};

// 计算属性
const freeShippingProgress = computed(() => {
  if (props.summary.shipping === 0) return 100;
  const needed = 100 - props.summary.subtotal;
  return Math.max(0, Math.min(100, (props.summary.subtotal / 100) * 100));
});
</script>

<style scoped>
.cart-summary {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 20px;
}

.cart-summary h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
}

.cart-summary h4 {
  margin: 15px 0 8px 0;
  font-size: 14px;
  color: #666;
  font-weight: 600;
}

.summary-section {
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.summary-row.total {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.summary-row.discount {
  color: #27ae60;
}

.free-shipping {
  color: #27ae60;
  font-weight: 600;
}

.divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 10px 0;
}

.discount-section {
  margin-bottom: 20px;
}

.discount-input-group {
  display: flex;
  gap: 5px;
}

.discount-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.discount-input:focus {
  outline: none;
  border-color: #3742fa;
}

.apply-btn {
  padding: 8px 16px;
  background: #3742fa;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.apply-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.discount-message {
  margin: 8px 0 0 0;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 3px;
}

.discount-message.success {
  background: #d4edda;
  color: #155724;
}

.discount-message.error {
  background: #f8d7da;
  color: #721c24;
}

.checkout-section {
  text-align: center;
  margin-bottom: 20px;
}

.checkout-btn {
  width: 100%;
  padding: 15px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.checkout-btn:hover:not(:disabled) {
  background: #219a52;
}

.checkout-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.secure-checkout {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #666;
}

.shipping-info,
.payment-methods {
  margin-bottom: 15px;
}

.shipping-info ul {
  margin: 8px 0 0 0;
  padding: 0;
  list-style: none;
}

.shipping-info li {
  padding: 4px 0;
  font-size: 12px;
  color: #666;
}

.payment-icons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.payment-icon {
  font-size: 20px;
  padding: 4px;
  background: #f5f5f5;
  border-radius: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cart-summary {
    position: static;
    margin-top: 20px;
  }
}
</style>