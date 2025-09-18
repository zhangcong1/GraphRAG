import { CartItem, CartSummary, Product } from '../types/cart.ts';

/**
 * 购物车工具函数集合
 */

/**
 * 计算购物车总金额
 */
export function calculateCartTotal(items: CartItem[]): CartSummary {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => {
        const itemPrice = item.product.price;
        const optionsPrice = item.selectedOptions?.reduce(
            (optSum, opt) => optSum + (opt.priceModifier || 0), 0
        ) || 0;
        return sum + (itemPrice + optionsPrice) * item.quantity;
    }, 0);
    
    const tax = subtotal * 0.08; // 8% 税率
    const shipping = subtotal > 100 ? 0 : 10; // 满100免运费
    const total = subtotal + tax + shipping;
    
    return {
        totalItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        shipping,
        total: parseFloat(total.toFixed(2))
    };
}

/**
 * 添加商品到购物车
 */
export function addToCart(currentItems: CartItem[], newItem: CartItem): CartItem[] {
    const existingItemIndex = currentItems.findIndex(
        item => item.product.id === newItem.product.id &&
        JSON.stringify(item.selectedOptions) === JSON.stringify(newItem.selectedOptions)
    );
    
    if (existingItemIndex !== -1) {
        // 如果商品已存在，增加数量
        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        return updatedItems;
    } else {
        // 如果是新商品，直接添加
        return [...currentItems, newItem];
    }
}

/**
 * 从购物车移除商品
 */
export function removeFromCart(items: CartItem[], productId: number): CartItem[] {
    return items.filter(item => item.product.id !== productId);
}

/**
 * 更新购物车商品数量
 */
export function updateQuantity(items: CartItem[], productId: number, newQuantity: number): CartItem[] {
    if (newQuantity <= 0) {
        return removeFromCart(items, productId);
    }
    
    return items.map(item => 
        item.product.id === productId 
            ? { ...item, quantity: newQuantity }
            : item
    );
}

/**
 * 获取购物车中的商品数量
 */
export function getItemQuantity(items: CartItem[], productId: number): number {
    const item = items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
}

/**
 * 清空购物车
 */
export function clearCart(): CartItem[] {
    return [];
}

/**
 * 格式化价格显示
 */
export function formatPrice(price: number, currency: string = '¥'): string {
    return `${currency}${price.toFixed(2)}`;
}

/**
 * 检查商品是否有库存
 */
export function checkAvailability(product: Product, requestedQuantity: number): boolean {
    // 简化的库存检查逻辑
    return requestedQuantity > 0 && requestedQuantity <= 100;
}

/**
 * 计算折扣后价格
 */
export function applyDiscount(originalPrice: number, discountPercent: number): number {
    const discountAmount = originalPrice * (discountPercent / 100);
    return originalPrice - discountAmount;
}

/**
 * 验证购物车数据
 */
export function validateCart(items: CartItem[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (items.length === 0) {
        errors.push('购物车为空');
    }
    
    for (const item of items) {
        if (!item.product || !item.product.id) {
            errors.push('无效的商品信息');
        }
        
        if (item.quantity <= 0) {
            errors.push(`商品 ${item.product?.name || '未知'} 的数量无效`);
        }
        
        if (!checkAvailability(item.product, item.quantity)) {
            errors.push(`商品 ${item.product?.name || '未知'} 库存不足`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}