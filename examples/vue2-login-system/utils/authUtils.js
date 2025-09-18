import { ValidationRule, FormField } from '../types/auth.ts';

/**
 * 认证相关工具函数集合
 */

/**
 * 验证电子邮件格式
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证密码强度
 */
export function validatePassword(password) {
    if (!password || password.length < 6) {
        return '密码至少需要6个字符';
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
        return '密码需要包含大小写字母';
    }
    
    if (!/(?=.*\d)/.test(password)) {
        return '密码需要包含数字';
    }
    
    return null; // 验证通过
}

/**
 * 验证用户名格式
 */
export function validateUsername(username) {
    if (!username || username.length < 3) {
        return '用户名至少需要3个字符';
    }
    
    if (username.length > 20) {
        return '用户名不能超过20个字符';
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return '用户名只能包含字母、数字、下划线和连字符';
    }
    
    return null;
}

/**
 * 通用表单字段验证
 */
export function validateField(value, rules) {
    for (const rule of rules) {
        // 必填验证
        if (rule.required && (!value || value.toString().trim() === '')) {
            return '此字段为必填项';
        }
        
        // 跳过空值的其他验证
        if (!value) continue;
        
        // 最小长度验证
        if (rule.minLength && value.length < rule.minLength) {
            return `最少需要${rule.minLength}个字符`;
        }
        
        // 最大长度验证
        if (rule.maxLength && value.length > rule.maxLength) {
            return `最多只能${rule.maxLength}个字符`;
        }
        
        // 邮箱格式验证
        if (rule.email && !validateEmail(value)) {
            return '请输入有效的邮箱地址';
        }
        
        // 正则表达式验证
        if (rule.pattern && !rule.pattern.test(value)) {
            return '格式不正确';
        }
        
        // 自定义验证
        if (rule.custom) {
            const result = rule.custom(value);
            if (result !== true) {
                return typeof result === 'string' ? result : '验证失败';
            }
        }
    }
    
    return null; // 验证通过
}

/**
 * 验证整个表单
 */
export function validateForm(formData, fields) {
    const errors = {};
    let isValid = true;
    
    for (const field of fields) {
        const error = validateField(formData[field.name], field.rules);
        if (error) {
            errors[field.name] = error;
            isValid = false;
        }
    }
    
    return { isValid, errors };
}

/**
 * 格式化用户显示名
 */
export function formatUserDisplayName(user) {
    if (!user) return '未知用户';
    
    if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
    }
    
    return user.username || user.email || '未知用户';
}

/**
 * 检查用户权限
 */
export function hasPermission(user, permissionCode) {
    if (!user || !user.permissions) return false;
    
    return user.permissions.some(permission => 
        permission.code === permissionCode || 
        permission.code === '*' || // 超级权限
        user.role === 'admin' // 管理员拥有所有权限
    );
}

/**
 * 格式化最后登录时间
 */
export function formatLastLogin(lastLoginAt) {
    if (!lastLoginAt) return '从未登录';
    
    const now = new Date();
    const loginTime = new Date(lastLoginAt);
    const diffInMinutes = Math.floor((now - loginTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}小时前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}天前`;
    
    return loginTime.toLocaleDateString();
}

/**
 * 生成随机字符串（用于CSRF token等）
 */
export function generateRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 安全存储到localStorage
 */
export function secureStorageSet(key, value) {
    try {
        const data = {
            value: value,
            timestamp: Date.now(),
            checksum: btoa(JSON.stringify(value)) // 简单的完整性检查
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn('存储失败:', error);
    }
}

/**
 * 安全从localStorage读取
 */
export function secureStorageGet(key) {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        
        const data = JSON.parse(stored);
        
        // 验证完整性
        const expectedChecksum = btoa(JSON.stringify(data.value));
        if (data.checksum !== expectedChecksum) {
            console.warn('数据完整性验证失败');
            localStorage.removeItem(key);
            return null;
        }
        
        return data.value;
    } catch (error) {
        console.warn('读取存储失败:', error);
        return null;
    }
}

/**
 * 清理存储
 */
export function secureStorageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('清理存储失败:', error);
    }
}

/**
 * 节流函数
 */
export function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 防抖函数
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}