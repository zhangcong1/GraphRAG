import { httpClient } from '../utils/httpClient.js';
import { secureStorageSet, secureStorageGet, secureStorageRemove } from '../utils/authUtils.js';

/**
 * 认证服务类 - 处理所有认证相关的API调用
 */
export class AuthService {
    constructor() {
        this.endpoints = {
            login: '/auth/login',
            logout: '/auth/logout',
            register: '/auth/register',
            profile: '/auth/profile',
            refresh: '/auth/refresh',
            forgotPassword: '/auth/forgot-password',
            resetPassword: '/auth/reset-password',
            verifyEmail: '/auth/verify-email',
            changePassword: '/auth/change-password'
        };
        
        // 初始化时检查token
        this.checkTokenValidity();
    }
    
    /**
     * 用户登录
     */
    async login(credentials) {
        try {
            const response = await httpClient.post(this.endpoints.login, {
                username: credentials.username,
                password: credentials.password,
                rememberMe: credentials.rememberMe || false,
                captcha: credentials.captcha
            });
            
            if (response.data.success) {
                // 存储认证信息
                this.storeAuthData(response.data);
                return {
                    success: true,
                    user: response.data.user,
                    message: '登录成功'
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || '登录失败'
                };
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 用户注册
     */
    async register(registerData) {
        try {
            const response = await httpClient.post(this.endpoints.register, {
                username: registerData.username,
                email: registerData.email,
                password: registerData.password,
                firstName: registerData.firstName,
                lastName: registerData.lastName
            });
            
            return {
                success: response.data.success,
                message: response.data.message || (response.data.success ? '注册成功' : '注册失败'),
                user: response.data.user
            };
        } catch (error) {
            console.error('注册请求失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 用户登出
     */
    async logout() {
        try {
            // 向服务器发送登出请求
            await httpClient.post(this.endpoints.logout);
        } catch (error) {
            console.warn('登出请求失败:', error);
        } finally {
            // 无论如何都清除本地数据
            this.clearAuthData();
        }
        
        return { success: true };
    }
    
    /**
     * 获取用户信息
     */
    async getUserProfile() {
        try {
            const response = await httpClient.get(this.endpoints.profile);
            return {
                success: true,
                user: response.data
            };
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 更新用户信息
     */
    async updateProfile(userData) {
        try {
            const response = await httpClient.put(this.endpoints.profile, userData);
            return {
                success: true,
                user: response.data,
                message: '用户信息更新成功'
            };
        } catch (error) {
            console.error('更新用户信息失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 刷新token
     */
    async refreshToken() {
        try {
            const refreshToken = secureStorageGet('refresh_token');
            if (!refreshToken) {
                throw new Error('没有刷新令牌');
            }
            
            const response = await httpClient.post(this.endpoints.refresh, {
                refreshToken: refreshToken
            });
            
            if (response.data.success) {
                this.storeAuthData(response.data);
                return { success: true };
            } else {
                this.clearAuthData();
                return { success: false };
            }
        } catch (error) {
            console.error('刷新token失败:', error);
            this.clearAuthData();
            return { success: false };
        }
    }
    
    /**
     * 修改密码
     */
    async changePassword(passwordData) {
        try {
            const response = await httpClient.post(this.endpoints.changePassword, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            
            return {
                success: response.data.success,
                message: response.data.message || '密码修改成功'
            };
        } catch (error) {
            console.error('修改密码失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 忘记密码
     */
    async forgotPassword(email) {
        try {
            const response = await httpClient.post(this.endpoints.forgotPassword, {
                email: email
            });
            
            return {
                success: response.data.success,
                message: response.data.message || '密码重置邮件已发送'
            };
        } catch (error) {
            console.error('忘记密码请求失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 重置密码
     */
    async resetPassword(resetData) {
        try {
            const response = await httpClient.post(this.endpoints.resetPassword, {
                token: resetData.token,
                newPassword: resetData.newPassword
            });
            
            return {
                success: response.data.success,
                message: response.data.message || '密码重置成功'
            };
        } catch (error) {
            console.error('重置密码失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 验证邮箱
     */
    async verifyEmail(token) {
        try {
            const response = await httpClient.post(this.endpoints.verifyEmail, {
                token: token
            });
            
            return {
                success: response.data.success,
                message: response.data.message || '邮箱验证成功'
            };
        } catch (error) {
            console.error('邮箱验证失败:', error);
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    /**
     * 检查当前用户是否已认证
     */
    isAuthenticated() {
        const token = secureStorageGet('auth_token');
        return !!token;
    }
    
    /**
     * 获取当前用户
     */
    getCurrentUser() {
        return secureStorageGet('user_info');
    }
    
    /**
     * 获取认证token
     */
    getToken() {
        return secureStorageGet('auth_token');
    }
    
    /**
     * 存储认证数据
     */
    storeAuthData(authData) {
        secureStorageSet('auth_token', authData.token);
        secureStorageSet('refresh_token', authData.refreshToken);
        secureStorageSet('user_info', authData.user);
        
        // 设置token过期时间
        if (authData.expiresIn) {
            const expirationTime = Date.now() + (authData.expiresIn * 1000);
            secureStorageSet('token_expiration', expirationTime);
        }
    }
    
    /**
     * 清除认证数据
     */
    clearAuthData() {
        secureStorageRemove('auth_token');
        secureStorageRemove('refresh_token');
        secureStorageRemove('user_info');
        secureStorageRemove('token_expiration');
    }
    
    /**
     * 检查token有效性
     */
    checkTokenValidity() {
        const expirationTime = secureStorageGet('token_expiration');
        if (expirationTime && Date.now() > expirationTime) {
            // Token已过期，尝试刷新
            this.refreshToken().catch(() => {
                // 刷新失败，清除数据
                this.clearAuthData();
            });
        }
    }
    
    /**
     * 获取错误消息
     */
    getErrorMessage(error) {
        if (error.data && error.data.message) {
            return error.data.message;
        }
        
        switch (error.status) {
            case 400:
                return '请求参数错误';
            case 401:
                return '用户名或密码错误';
            case 403:
                return '没有权限访问';
            case 404:
                return '请求的资源不存在';
            case 422:
                return '数据验证失败';
            case 429:
                return '请求过于频繁，请稍后再试';
            case 500:
                return '服务器内部错误';
            case 503:
                return '服务暂时不可用';
            default:
                return '网络错误，请检查网络连接';
        }
    }
}

// 创建单例实例
export const authService = new AuthService();