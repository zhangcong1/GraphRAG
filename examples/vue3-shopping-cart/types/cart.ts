/**
 * 购物车相关类型定义
 */

export interface Product {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
    description?: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
    selectedOptions?: ProductOption[];
}

export interface ProductOption {
    type: 'size' | 'color' | 'variant';
    value: string;
    priceModifier?: number;
}

export interface CartSummary {
    totalItems: number;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    discountAmount?: number;
}

export interface User {
    id: number;
    email: string;
    name: string;
    preferences: UserPreferences;
}

export interface UserPreferences {
    currency: string;
    language: string;
    notifications: boolean;
}

export type CartAction = 
    | { type: 'ADD_ITEM'; payload: CartItem }
    | { type: 'REMOVE_ITEM'; payload: number }
    | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
    | { type: 'CLEAR_CART' }
    | { type: 'APPLY_DISCOUNT'; payload: string };