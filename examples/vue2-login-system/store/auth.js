import { authService } from '../utils/authService.js';

/**
 * 认证状态管理模块
 */
export const authStore = {
    namespaced: true,
    
    state: {
        // 认证状态
        isAuthenticated: false,
        isLoading: false,
        
        // 用户信息
        user: null,
        token: null,
        
        // 错误信息
        loginError: null,
        registerError: null,
        
        // 登录历史
        loginAttempts: 0,
        lastLoginTime: null,
        
        // UI状态
        showLoginModal: false,
        redirectPath: null
    },
    
    getters: {
        // 是否已登录
        isLoggedIn: state => state.isAuthenticated && !!state.user,
        
        // 用户显示名
        userDisplayName: state => {
            if (!state.user) return '';
            if (state.user.firstName && state.user.lastName) {
                return `${state.user.firstName} ${state.user.lastName}`;
            }
            return state.user.username || state.user.email || '';
        },
        
        // 用户权限
        userPermissions: state => {
            return state.user ? state.user.permissions || [] : [];
        },
        
        // 用户角色
        userRole: state => {
            return state.user ? state.user.role : 'guest';
        },
        
        // 是否是管理员
        isAdmin: state => {
            return state.user && state.user.role === 'admin';
        },
        
        // 检查是否有特定权限
        hasPermission: (state, getters) => (permissionCode) => {
            if (getters.isAdmin) return true;
            return getters.userPermissions.some(p => 
                p.code === permissionCode || p.code === '*'
            );
        },
        
        // 登录状态文本
        authStatusText: (state, getters) => {
            if (state.isLoading) return '处理中...';
            if (getters.isLoggedIn) return `欢迎, ${getters.userDisplayName}`;
            return '未登录';
        }
    },
    
    mutations: {
        // 设置加载状态
        SET_LOADING(state, loading) {
            state.isLoading = loading;
        },
        
        // 登录成功
        LOGIN_SUCCESS(state, { user, token }) {
            state.isAuthenticated = true;
            state.user = user;
            state.token = token;
            state.loginError = null;
            state.lastLoginTime = new Date();
            state.loginAttempts = 0;
        },
        
        // 登录失败
        LOGIN_FAILURE(state, error) {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.loginError = error;
            state.loginAttempts += 1;
        },
        
        // 注册失败
        REGISTER_FAILURE(state, error) {
            state.registerError = error;
        },
        
        // 清除错误
        CLEAR_ERRORS(state) {
            state.loginError = null;
            state.registerError = null;
        },
        
        // 登出
        LOGOUT(state) {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.loginError = null;
            state.registerError = null;
        },
        
        // 更新用户信息
        UPDATE_USER(state, user) {
            state.user = { ...state.user, ...user };
        },
        
        // 设置重定向路径
        SET_REDIRECT_PATH(state, path) {
            state.redirectPath = path;
        },
        
        // 清除重定向路径
        CLEAR_REDIRECT_PATH(state) {
            state.redirectPath = null;
        },
        
        // 显示/隐藏登录模态框
        SET_LOGIN_MODAL(state, show) {
            state.showLoginModal = show;
        },
        
        // 初始化认证状态
        INIT_AUTH(state) {
            const user = authService.getCurrentUser();
            const token = authService.getToken();
            
            if (user && token && authService.isAuthenticated()) {
                state.isAuthenticated = true;
                state.user = user;
                state.token = token;
            }
        }
    },
    
    actions: {
        // 初始化认证状态
        initAuth({ commit }) {
            commit('INIT_AUTH');
        },
        
        // 登录
        async login({ commit, dispatch }, credentials) {
            commit('SET_LOADING', true);
            commit('CLEAR_ERRORS');
            
            try {
                const result = await authService.login(credentials);
                
                if (result.success) {
                    commit('LOGIN_SUCCESS', {
                        user: result.user,
                        token: authService.getToken()
                    });
                    
                    // 触发登录成功事件
                    dispatch('onLoginSuccess');
                    
                    return { success: true };
                } else {
                    commit('LOGIN_FAILURE', result.message);
                    return { success: false, message: result.message };
                }
            } catch (error) {
                const errorMessage = '登录过程中发生错误';
                commit('LOGIN_FAILURE', errorMessage);
                return { success: false, message: errorMessage };
            } finally {
                commit('SET_LOADING', false);
            }
        },
        
        // 注册
        async register({ commit }, registerData) {
            commit('SET_LOADING', true);
            commit('CLEAR_ERRORS');
            
            try {
                const result = await authService.register(registerData);
                
                if (!result.success) {
                    commit('REGISTER_FAILURE', result.message);
                }
                
                return result;
            } catch (error) {
                const errorMessage = '注册过程中发生错误';
                commit('REGISTER_FAILURE', errorMessage);
                return { success: false, message: errorMessage };
            } finally {
                commit('SET_LOADING', false);
            }
        },
        
        // 登出
        async logout({ commit, dispatch }) {
            commit('SET_LOADING', true);
            
            try {
                await authService.logout();
                commit('LOGOUT');
                
                // 触发登出事件
                dispatch('onLogout');
                
                return { success: true };
            } catch (error) {
                console.error('登出失败:', error);
                // 即使失败也清除本地状态
                commit('LOGOUT');
                return { success: false };
            } finally {
                commit('SET_LOADING', false);
            }
        },
        
        // 获取用户信息
        async fetchUserProfile({ commit }) {
            commit('SET_LOADING', true);
            
            try {
                const result = await authService.getUserProfile();
                
                if (result.success) {
                    commit('UPDATE_USER', result.user);
                }
                
                return result;
            } catch (error) {
                console.error('获取用户信息失败:', error);
                return { success: false };
            } finally {
                commit('SET_LOADING', false);
            }
        },
        
        // 更新用户信息
        async updateProfile({ commit }, userData) {
            commit('SET_LOADING', true);
            
            try {
                const result = await authService.updateProfile(userData);
                
                if (result.success) {
                    commit('UPDATE_USER', result.user);
                }
                
                return result;
            } catch (error) {
                console.error('更新用户信息失败:', error);
                return { success: false, message: '更新失败' };
            } finally {
                commit('SET_LOADING', false);
            }
        },
        
        // 修改密码
        async changePassword({ commit }, passwordData) {
            commit('SET_LOADING', true);
            
            try {
                const result = await authService.changePassword(passwordData);
                return result;
            } catch (error) {
                console.error('修改密码失败:', error);
                return { success: false, message: '修改密码失败' };
            } finally {
                commit('SET_LOADING', false);
            }
        },
        
        // 检查认证状态
        async checkAuthStatus({ commit, dispatch }) {
            if (authService.isAuthenticated()) {
                const user = authService.getCurrentUser();
                if (user) {
                    commit('LOGIN_SUCCESS', {
                        user: user,
                        token: authService.getToken()
                    });
                    
                    // 刷新用户信息
                    dispatch('fetchUserProfile');
                }
            }
        },
        
        // 登录成功后的处理
        onLoginSuccess({ commit, state }) {
            // 关闭登录模态框
            commit('SET_LOGIN_MODAL', false);
            
            // 如果有重定向路径，跳转到该路径
            if (state.redirectPath) {
                this.$router.push(state.redirectPath);
                commit('CLEAR_REDIRECT_PATH');
            }
            
            // 发送全局事件
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user: state.user }
                }));
            }
        },
        
        // 登出后的处理
        onLogout({ commit }) {
            // 清除重定向路径
            commit('CLEAR_REDIRECT_PATH');
            
            // 跳转到首页
            if (this.$router) {
                this.$router.push('/');
            }
            
            // 发送全局事件
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
        },
        
        // 清除错误信息
        clearErrors({ commit }) {
            commit('CLEAR_ERRORS');
        },
        
        // 设置重定向路径
        setRedirectPath({ commit }, path) {
            commit('SET_REDIRECT_PATH', path);
        },
        
        // 显示登录模态框
        showLoginModal({ commit }) {
            commit('SET_LOGIN_MODAL', true);
        },
        
        // 隐藏登录模态框
        hideLoginModal({ commit }) {
            commit('SET_LOGIN_MODAL', false);
        }
    }
};