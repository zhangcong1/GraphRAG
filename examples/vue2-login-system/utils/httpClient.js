import { secureStorageGet } from './authUtils.js';

/**
 * HTTP请求工具类
 */
export class HttpClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.interceptors = {
            request: [],
            response: []
        };
        
        // 添加默认请求拦截器
        this.addRequestInterceptor((config) => {
            // 添加认证头
            const token = secureStorageGet('auth_token');
            if (token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            
            // 添加CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]');
            if (csrfToken) {
                config.headers = config.headers || {};
                config.headers['X-CSRF-TOKEN'] = csrfToken.getAttribute('content');
            }
            
            return config;
        });
        
        // 添加默认响应拦截器
        this.addResponseInterceptor(
            (response) => response,
            (error) => {
                // 统一错误处理
                if (error.status === 401) {
                    // 未授权，清除本地认证信息
                    this.clearAuthData();
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }
    
    /**
     * 添加请求拦截器
     */
    addRequestInterceptor(fulfilled, rejected) {
        this.interceptors.request.push({ fulfilled, rejected });
    }
    
    /**
     * 添加响应拦截器
     */
    addResponseInterceptor(fulfilled, rejected) {
        this.interceptors.response.push({ fulfilled, rejected });
    }
    
    /**
     * 执行请求拦截器
     */
    async executeRequestInterceptors(config) {
        let result = config;
        
        for (const interceptor of this.interceptors.request) {
            try {
                if (interceptor.fulfilled) {
                    result = await interceptor.fulfilled(result);
                }
            } catch (error) {
                if (interceptor.rejected) {
                    return interceptor.rejected(error);
                }
                throw error;
            }
        }
        
        return result;
    }
    
    /**
     * 执行响应拦截器
     */
    async executeResponseInterceptors(response) {
        let result = response;
        
        for (const interceptor of this.interceptors.response) {
            try {
                if (interceptor.fulfilled) {
                    result = await interceptor.fulfilled(result);
                }
            } catch (error) {
                if (interceptor.rejected) {
                    return interceptor.rejected(error);
                }
                throw error;
            }
        }
        
        return result;
    }
    
    /**
     * 基础请求方法
     */
    async request(config) {
        // 合并默认配置
        const finalConfig = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            ...config,
            url: `${this.baseURL}${config.url}`
        };
        
        try {
            // 执行请求拦截器
            const interceptedConfig = await this.executeRequestInterceptors(finalConfig);
            
            // 发送请求
            const response = await fetch(interceptedConfig.url, {
                method: interceptedConfig.method,
                headers: interceptedConfig.headers,
                body: interceptedConfig.data ? JSON.stringify(interceptedConfig.data) : undefined,
                credentials: 'include' // 包含cookies
            });
            
            // 解析响应
            let data = null;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            const result = {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config: interceptedConfig
            };
            
            if (!response.ok) {
                throw result;
            }
            
            // 执行响应拦截器
            return await this.executeResponseInterceptors(result);
            
        } catch (error) {
            // 执行响应错误拦截器
            for (const interceptor of this.interceptors.response) {
                if (interceptor.rejected) {
                    try {
                        return await interceptor.rejected(error);
                    } catch (e) {
                        // 继续到下一个拦截器
                    }
                }
            }
            throw error;
        }
    }
    
    /**
     * GET请求
     */
    get(url, config = {}) {
        return this.request({ ...config, method: 'GET', url });
    }
    
    /**
     * POST请求
     */
    post(url, data, config = {}) {
        return this.request({ ...config, method: 'POST', url, data });
    }
    
    /**
     * PUT请求
     */
    put(url, data, config = {}) {
        return this.request({ ...config, method: 'PUT', url, data });
    }
    
    /**
     * DELETE请求
     */
    delete(url, config = {}) {
        return this.request({ ...config, method: 'DELETE', url });
    }
    
    /**
     * PATCH请求
     */
    patch(url, data, config = {}) {
        return this.request({ ...config, method: 'PATCH', url, data });
    }
    
    /**
     * 清除认证数据
     */
    clearAuthData() {
        const authKeys = ['auth_token', 'refresh_token', 'user_info'];
        authKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }
    
    /**
     * 设置基础URL
     */
    setBaseURL(url) {
        this.baseURL = url;
    }
    
    /**
     * 设置默认头部
     */
    setDefaultHeader(name, value) {
        // 这里可以扩展默认头部设置功能
    }
}

// 创建默认实例
export const httpClient = new HttpClient();

// 便捷的导出方法
export const get = (url, config) => httpClient.get(url, config);
export const post = (url, data, config) => httpClient.post(url, data, config);
export const put = (url, data, config) => httpClient.put(url, data, config);
export const del = (url, config) => httpClient.delete(url, config);
export const patch = (url, data, config) => httpClient.patch(url, data, config);