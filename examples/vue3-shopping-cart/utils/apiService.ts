import { Product, CartItem, User } from '../types/cart';

/**
 * API服务类 - 处理所有与服务器的通信
 */
export class ApiService {
    private baseUrl: string;
    
    constructor(baseUrl: string = 'https://api.example.com') {
        this.baseUrl = baseUrl;
    }

    /**
     * 获取产品列表
     */
    async getProducts(category?: string): Promise<Product[]> {
        const url = category 
            ? `${this.baseUrl}/products?category=${category}`
            : `${this.baseUrl}/products`;
        
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('获取产品失败:', error);
            throw new Error('无法获取产品列表');
        }
    }

    /**
     * 获取单个产品详情
     */
    async getProduct(id: number): Promise<Product> {
        try {
            const response = await fetch(`${this.baseUrl}/products/${id}`);
            return await response.json();
        } catch (error) {
            console.error('获取产品详情失败:', error);
            throw new Error('无法获取产品详情');
        }
    }

    /**
     * 保存购物车到服务器
     */
    async saveCart(userId: number, cartItems: CartItem[]): Promise<void> {
        try {
            await fetch(`${this.baseUrl}/cart/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: cartItems })
            });
        } catch (error) {
            console.error('保存购物车失败:', error);
            throw new Error('无法保存购物车');
        }
    }

    /**
     * 从服务器加载购物车
     */
    async loadCart(userId: number): Promise<CartItem[]> {
        try {
            const response = await fetch(`${this.baseUrl}/cart/${userId}`);
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('加载购物车失败:', error);
            return [];
        }
    }

    /**
     * 获取用户信息
     */
    async getUser(userId: number): Promise<User> {
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}`);
            return await response.json();
        } catch (error) {
            console.error('获取用户信息失败:', error);
            throw new Error('无法获取用户信息');
        }
    }

    /**
     * 提交订单
     */
    async submitOrder(userId: number, cartItems: CartItem[]): Promise<{ orderId: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    items: cartItems,
                    timestamp: new Date().toISOString()
                })
            });
            return await response.json();
        } catch (error) {
            console.error('提交订单失败:', error);
            throw new Error('无法提交订单');
        }
    }
}

// 导出单例实例
export const apiService = new ApiService();