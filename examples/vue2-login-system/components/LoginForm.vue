<template>
  <div class="login-form-container">
    <div class="login-form-card">
      <div class="login-header">
        <h2>用户登录</h2>
        <p>请输入您的账号信息</p>
      </div>
      
      <!-- 错误提示 -->
      <div v-if="loginError" class="error-message">
        <i class="icon-error"></i>
        {{ loginError }}
      </div>
      
      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin" class="login-form">
        <!-- 用户名输入 -->
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="loginForm.username"
            type="text"
            placeholder="请输入用户名或邮箱"
            :class="{ 'error': errors.username }"
            @blur="validateField('username')"
            @input="clearFieldError('username')"
          />
          <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
        </div>
        
        <!-- 密码输入 -->
        <div class="form-group">
          <label for="password">密码</label>
          <div class="password-input">
            <input
              id="password"
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              :class="{ 'error': errors.password }"
              @blur="validateField('password')"
              @input="clearFieldError('password')"
            />
            <button
              type="button"
              class="password-toggle"
              @click="togglePassword"
            >
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </div>
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>
        
        <!-- 验证码 -->
        <div v-if="showCaptcha" class="form-group">
          <label for="captcha">验证码</label>
          <div class="captcha-input">
            <input
              id="captcha"
              v-model="loginForm.captcha"
              type="text"
              placeholder="请输入验证码"
              :class="{ 'error': errors.captcha }"
              @blur="validateField('captcha')"
              @input="clearFieldError('captcha')"
            />
            <img
              :src="captchaUrl"
              alt="验证码"
              class="captcha-image"
              @click="refreshCaptcha"
              title="点击刷新验证码"
            />
          </div>
          <span v-if="errors.captcha" class="field-error">{{ errors.captcha }}</span>
        </div>
        
        <!-- 记住我 -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              v-model="loginForm.rememberMe"
              type="checkbox"
            />
            <span class="checkbox-text">记住我</span>
          </label>
          <a href="#" @click.prevent="showForgotPassword" class="forgot-link">
            忘记密码？
          </a>
        </div>
        
        <!-- 登录按钮 -->
        <div class="form-group">
          <button
            type="submit"
            class="login-button"
            :disabled="isLoading || !isFormValid"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </div>
        
        <!-- 注册链接 -->
        <div class="form-group register-link">
          <span>还没有账号？</span>
          <a href="#" @click.prevent="showRegister">立即注册</a>
        </div>
      </form>
      
      <!-- 社交登录 -->
      <div v-if="enableSocialLogin" class="social-login">
        <div class="divider">
          <span>或使用以下方式登录</span>
        </div>
        <div class="social-buttons">
          <button
            v-for="provider in socialProviders"
            :key="provider.name"
            @click="handleSocialLogin(provider)"
            :class="['social-button', provider.name]"
          >
            <i :class="provider.icon"></i>
            {{ provider.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import { validateField, validateUsername, validatePassword } from '../utils/authUtils.js';

export default {
  name: 'LoginForm',
  
  props: {
    enableSocialLogin: {
      type: Boolean,
      default: true
    },
    redirectPath: {
      type: String,
      default: null
    }
  },
  
  data() {
    return {
      // 表单数据
      loginForm: {
        username: '',
        password: '',
        rememberMe: false,
        captcha: ''
      },
      
      // 表单验证错误
      errors: {},
      
      // UI状态
      showPassword: false,
      showCaptcha: false,
      captchaUrl: '',
      
      // 社交登录配置
      socialProviders: [
        { name: 'wechat', label: '微信登录', icon: 'icon-wechat' },
        { name: 'qq', label: 'QQ登录', icon: 'icon-qq' },
        { name: 'github', label: 'GitHub登录', icon: 'icon-github' }
      ],
      
      // 表单验证规则
      validationRules: {
        username: [
          { required: true },
          { minLength: 3 }
        ],
        password: [
          { required: true },
          { minLength: 6 }
        ],
        captcha: [
          { required: true, when: () => this.showCaptcha }
        ]
      }
    };
  },
  
  computed: {
    ...mapState('auth', [
      'isLoading',
      'loginError',
      'loginAttempts'
    ]),
    
    ...mapGetters('auth', [
      'isLoggedIn'
    ]),
    
    // 表单是否有效
    isFormValid() {
      return this.loginForm.username && 
             this.loginForm.password && 
             Object.keys(this.errors).length === 0;
    }
  },
  
  watch: {
    // 监听登录尝试次数，超过3次显示验证码
    loginAttempts(newVal) {
      if (newVal >= 3) {
        this.showCaptcha = true;
        this.refreshCaptcha();
      }
    },
    
    // 监听登录状态，成功后处理跳转
    isLoggedIn(newVal) {
      if (newVal) {
        this.handleLoginSuccess();
      }
    },
    
    // 监听重定向路径
    redirectPath(newVal) {
      if (newVal) {
        this.setRedirectPath(newVal);
      }
    }
  },
  
  created() {
    // 生成验证码URL
    this.refreshCaptcha();
    
    // 检查是否需要显示验证码
    if (this.loginAttempts >= 3) {
      this.showCaptcha = true;
    }
    
    // 设置重定向路径
    if (this.redirectPath) {
      this.setRedirectPath(this.redirectPath);
    }
  },
  
  methods: {
    ...mapActions('auth', [
      'login',
      'clearErrors',
      'setRedirectPath'
    ]),
    
    // 处理登录提交
    async handleLogin() {
      // 验证表单
      if (!this.validateForm()) {
        return;
      }
      
      try {
        const result = await this.login(this.loginForm);
        
        if (!result.success) {
          // 登录失败，可能需要显示验证码
          if (this.loginAttempts >= 2) {
            this.showCaptcha = true;
            this.refreshCaptcha();
          }
        }
      } catch (error) {
        console.error('登录失败:', error);
      }
    },
    
    // 验证整个表单
    validateForm() {
      this.errors = {};
      let isValid = true;
      
      // 验证用户名
      const usernameError = validateUsername(this.loginForm.username);
      if (usernameError) {
        this.errors.username = usernameError;
        isValid = false;
      }
      
      // 验证密码
      const passwordError = validatePassword(this.loginForm.password);
      if (passwordError) {
        this.errors.password = passwordError;
        isValid = false;
      }
      
      // 验证验证码
      if (this.showCaptcha && !this.loginForm.captcha) {
        this.errors.captcha = '请输入验证码';
        isValid = false;
      }
      
      return isValid;
    },
    
    // 验证单个字段
    validateField(fieldName) {
      const value = this.loginForm[fieldName];
      const rules = this.validationRules[fieldName];
      
      if (rules) {
        const error = validateField(value, rules);
        if (error) {
          this.$set(this.errors, fieldName, error);
        } else {
          this.$delete(this.errors, fieldName);
        }
      }
    },
    
    // 清除字段错误
    clearFieldError(fieldName) {
      if (this.errors[fieldName]) {
        this.$delete(this.errors, fieldName);
      }
    },
    
    // 切换密码显示
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    
    // 刷新验证码
    refreshCaptcha() {
      this.captchaUrl = `/api/captcha?t=${Date.now()}`;
      this.loginForm.captcha = '';
    },
    
    // 显示忘记密码
    showForgotPassword() {
      this.$emit('show-forgot-password');
    },
    
    // 显示注册
    showRegister() {
      this.$emit('show-register');
    },
    
    // 社交登录
    handleSocialLogin(provider) {
      // 跳转到社交登录页面
      window.location.href = `/api/auth/social/${provider.name}`;
    },
    
    // 登录成功处理
    handleLoginSuccess() {
      this.$emit('login-success');
      
      // 显示成功消息
      this.$message({
        type: 'success',
        message: '登录成功！'
      });
      
      // 清空表单
      this.resetForm();
    },
    
    // 重置表单
    resetForm() {
      this.loginForm = {
        username: '',
        password: '',
        rememberMe: false,
        captcha: ''
      };
      this.errors = {};
      this.showPassword = false;
    },
    
    // 清除所有错误
    clearAllErrors() {
      this.errors = {};
      this.clearErrors();
    }
  }
};
</script>

<style scoped>
.login-form-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-form-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.login-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 20px;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #374151;
  font-weight: 500;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-group input.error {
  border-color: #dc2626;
}

.password-input {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
}

.captcha-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

.captcha-input input {
  flex: 1;
}

.captcha-image {
  width: 100px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
}

.field-error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.checkbox-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input {
  margin-right: 8px;
}

.forgot-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 14px;
}

.forgot-link:hover {
  text-decoration: underline;
}

.login-button {
  width: 100%;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.login-button:hover:not(:disabled) {
  background: #2563eb;
}

.login-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.register-link {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.register-link a {
  color: #3b82f6;
  text-decoration: none;
  margin-left: 4px;
}

.register-link a:hover {
  text-decoration: underline;
}

.social-login {
  margin-top: 30px;
}

.divider {
  text-align: center;
  position: relative;
  margin: 20px 0;
}

.divider span {
  background: white;
  color: #6b7280;
  padding: 0 16px;
  font-size: 14px;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e5e7eb;
  z-index: -1;
}

.social-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.social-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.social-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.social-button.wechat {
  color: #1aad19;
}

.social-button.qq {
  color: #12b7f5;
}

.social-button.github {
  color: #24292e;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-form-container {
    padding: 10px;
  }
  
  .login-form-card {
    padding: 30px 20px;
  }
}
</style>