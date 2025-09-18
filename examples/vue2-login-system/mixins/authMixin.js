/**
 * 认证相关的Vue2 Mixin
 * 提供常用的认证方法和计算属性
 */

import { mapState, mapGetters, mapActions } from 'vuex';
import { hasPermission, formatUserDisplayName } from '../utils/authUtils.js';

export const authMixin = {
    computed: {
        ...mapState('auth', {
            // 重命名避免冲突
            authUser: 'user',
            authIsLoading: 'isLoading',
            authIsAuthenticated: 'isAuthenticated',
            authLoginError: 'loginError'
        }),
        
        ...mapGetters('auth', [
            'isLoggedIn',
            'userDisplayName',
            'userPermissions',
            'userRole',
            'isAdmin',
            'authStatusText'
        ]),
        
        // 快速访问当前用户
        currentUser() {
            return this.authUser;
        },
        
        // 用户是否已验证邮箱
        isEmailVerified() {
            return this.authUser && this.authUser.emailVerified;
        },
        
        // 用户是否激活
        isUserActive() {
            return this.authUser && this.authUser.isActive;
        }
    },
    
    methods: {
        ...mapActions('auth', {
            // 重命名避免方法名冲突
            doLogin: 'login',
            doLogout: 'logout',
            doRegister: 'register',
            checkAuth: 'checkAuthStatus',
            updateUserProfile: 'updateProfile',
            changeUserPassword: 'changePassword'
        }),
        
        /**
         * 检查用户是否有特定权限
         * @param {string} permissionCode 权限代码
         * @returns {boolean}
         */
        hasPermission(permissionCode) {
            return hasPermission(this.authUser, permissionCode);
        },
        
        /**
         * 检查用户是否有任意一个权限
         * @param {string[]} permissionCodes 权限代码数组
         * @returns {boolean}
         */
        hasAnyPermission(permissionCodes) {
            if (!Array.isArray(permissionCodes)) {
                return false;
            }
            return permissionCodes.some(code => this.hasPermission(code));
        },
        
        /**
         * 检查用户是否有所有权限
         * @param {string[]} permissionCodes 权限代码数组
         * @returns {boolean}
         */
        hasAllPermissions(permissionCodes) {
            if (!Array.isArray(permissionCodes)) {
                return false;
            }
            return permissionCodes.every(code => this.hasPermission(code));
        },
        
        /**
         * 检查用户是否有指定角色
         * @param {string|string[]} roles 角色或角色数组
         * @returns {boolean}
         */
        hasRole(roles) {
            if (!this.authUser) return false;
            
            const userRole = this.authUser.role;
            if (Array.isArray(roles)) {
                return roles.includes(userRole);
            }
            return userRole === roles;
        },
        
        /**
         * 确保用户已登录，未登录则跳转到登录页
         * @param {string} redirectPath 登录后的重定向路径
         */
        requireAuth(redirectPath = null) {
            if (!this.isLoggedIn) {
                const currentPath = redirectPath || this.$route.fullPath;
                this.$store.dispatch('auth/setRedirectPath', currentPath);
                this.$router.push('/login');
                return false;
            }
            return true;
        },
        
        /**
         * 确保用户有特定权限，没有权限则显示错误
         * @param {string} permissionCode 权限代码
         * @param {string} errorMessage 错误消息
         */
        requirePermission(permissionCode, errorMessage = '您没有权限执行此操作') {
            if (!this.hasPermission(permissionCode)) {
                this.$message({
                    type: 'error',
                    message: errorMessage
                });
                return false;
            }
            return true;
        },
        
        /**
         * 确保用户有指定角色
         * @param {string|string[]} roles 角色或角色数组
         * @param {string} errorMessage 错误消息
         */
        requireRole(roles, errorMessage = '您的角色不足以执行此操作') {
            if (!this.hasRole(roles)) {
                this.$message({
                    type: 'error',
                    message: errorMessage
                });
                return false;
            }
            return true;
        },
        
        /**
         * 安全登出（确认后登出）
         * @param {string} message 确认消息
         */
        confirmLogout(message = '确定要退出登录吗？') {
            this.$confirm(message, '确认', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.doLogout();
            }).catch(() => {
                // 用户取消，不做任何操作
            });
        },
        
        /**
         * 获取用户显示名称
         * @param {Object} user 用户对象，默认为当前用户
         * @returns {string}
         */
        getUserDisplayName(user = null) {
            return formatUserDisplayName(user || this.authUser);
        },
        
        /**
         * 检查账户是否需要激活
         * @returns {boolean}
         */
        needsActivation() {
            return this.authUser && !this.authUser.isActive;
        },
        
        /**
         * 检查邮箱是否需要验证
         * @returns {boolean}
         */
        needsEmailVerification() {
            return this.authUser && !this.authUser.emailVerified;
        },
        
        /**
         * 格式化用户角色显示名
         * @param {string} role 角色代码
         * @returns {string}
         */
        formatRole(role = null) {
            const roleToFormat = role || this.userRole;
            const roleMap = {
                'admin': '管理员',
                'user': '普通用户',
                'moderator': '版主',
                'guest': '访客',
                'premium': '高级用户'
            };
            return roleMap[roleToFormat] || roleToFormat;
        }
    },
    
    // 组件创建时检查认证状态
    created() {
        // 如果没有用户信息但有token，尝试获取用户信息
        if (!this.authUser && this.$store.getters['auth/isLoggedIn']) {
            this.checkAuth();
        }
    }
};

/**
 * 权限指令 - 根据权限显示/隐藏元素
 * 用法: v-permission="'user.edit'" 或 v-permission="['user.edit', 'user.delete']"
 */
export const permissionDirective = {
    // Vue 2 指令钩子
    bind(el, binding, vnode) {
        const { value } = binding;
        const user = vnode.context.$store.state.auth.user;
        
        if (!user) {
            el.style.display = 'none';
            return;
        }
        
        let hasRequiredPermission = false;
        
        if (Array.isArray(value)) {
            // 数组：需要任意一个权限
            hasRequiredPermission = value.some(permission => 
                hasPermission(user, permission)
            );
        } else if (typeof value === 'string') {
            // 字符串：需要该权限
            hasRequiredPermission = hasPermission(user, value);
        }
        
        if (!hasRequiredPermission) {
            el.style.display = 'none';
        }
    },
    
    update(el, binding, vnode) {
        // 当权限改变时重新检查
        const { value } = binding;
        const user = vnode.context.$store.state.auth.user;
        
        if (!user) {
            el.style.display = 'none';
            return;
        }
        
        let hasRequiredPermission = false;
        
        if (Array.isArray(value)) {
            hasRequiredPermission = value.some(permission => 
                hasPermission(user, permission)
            );
        } else if (typeof value === 'string') {
            hasRequiredPermission = hasPermission(user, value);
        }
        
        el.style.display = hasRequiredPermission ? '' : 'none';
    }
};

/**
 * 角色指令 - 根据角色显示/隐藏元素
 * 用法: v-role="'admin'" 或 v-role="['admin', 'moderator']"
 */
export const roleDirective = {
    bind(el, binding, vnode) {
        const { value } = binding;
        const user = vnode.context.$store.state.auth.user;
        
        if (!user) {
            el.style.display = 'none';
            return;
        }
        
        const userRole = user.role;
        let hasRequiredRole = false;
        
        if (Array.isArray(value)) {
            hasRequiredRole = value.includes(userRole);
        } else if (typeof value === 'string') {
            hasRequiredRole = userRole === value;
        }
        
        if (!hasRequiredRole) {
            el.style.display = 'none';
        }
    },
    
    update(el, binding, vnode) {
        const { value } = binding;
        const user = vnode.context.$store.state.auth.user;
        
        if (!user) {
            el.style.display = 'none';
            return;
        }
        
        const userRole = user.role;
        let hasRequiredRole = false;
        
        if (Array.isArray(value)) {
            hasRequiredRole = value.includes(userRole);
        } else if (typeof value === 'string') {
            hasRequiredRole = userRole === value;
        }
        
        el.style.display = hasRequiredRole ? '' : 'none';
    }
};

/**
 * Vue插件安装函数
 */
export default {
    install(Vue) {
        // 注册全局mixin
        Vue.mixin(authMixin);
        
        // 注册全局指令
        Vue.directive('permission', permissionDirective);
        Vue.directive('role', roleDirective);
        
        // 注册全局属性
        Vue.prototype.$auth = {
            hasPermission: hasPermission,
            formatUserDisplayName: formatUserDisplayName
        };
    }
};