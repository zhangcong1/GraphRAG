<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h2>用户注册</h2>
        <p>创建您的新账户</p>
      </div>
      
      <!-- 错误提示 -->
      <div v-if="registerError" class="error-message">
        <i class="icon-error"></i>
        {{ registerError }}
      </div>
      
      <!-- 成功提示 -->
      <div v-if="registerSuccess" class="success-message">
        <i class="icon-success"></i>
        注册成功！请查收邮箱激活账户。
      </div>
      
      <!-- 注册表单 -->
      <form @submit.prevent="handleRegister" class="register-form">
        <!-- 基础信息 -->
        <div class="form-section">
          <h3>基础信息</h3>
          
          <!-- 用户名 -->
          <div class="form-group">
            <label for="username">用户名 *</label>
            <input
              id="username"
              v-model="registerForm.username"
              type="text"
              placeholder="请输入用户名（3-20个字符）"
              :class="{ 'error': errors.username }"
              @blur="validateField('username')"
              @input="clearFieldError('username')"
            />
            <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
            <div class="field-hint">用户名只能包含字母、数字、下划线和连字符</div>
          </div>
          
          <!-- 邮箱 -->
          <div class="form-group">
            <label for="email">邮箱地址 *</label>
            <input
              id="email"
              v-model="registerForm.email"
              type="email"
              placeholder="请输入邮箱地址"
              :class="{ 'error': errors.email }"
              @blur="validateField('email')"
              @input="clearFieldError('email')"
            />
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
          </div>
          
          <!-- 姓名 -->
          <div class="name-group">
            <div class="form-group">
              <label for="firstName">姓 *</label>
              <input
                id="firstName"
                v-model="registerForm.firstName"
                type="text"
                placeholder="姓"
                :class="{ 'error': errors.firstName }"
                @blur="validateField('firstName')"
                @input="clearFieldError('firstName')"
              />
              <span v-if="errors.firstName" class="field-error">{{ errors.firstName }}</span>
            </div>
            
            <div class="form-group">
              <label for="lastName">名 *</label>
              <input
                id="lastName"
                v-model="registerForm.lastName"
                type="text"
                placeholder="名"
                :class="{ 'error': errors.lastName }"
                @blur="validateField('lastName')"
                @input="clearFieldError('lastName')"
              />
              <span v-if="errors.lastName" class="field-error">{{ errors.lastName }}</span>
            </div>
          </div>
        </div>
        
        <!-- 密码设置 -->
        <div class="form-section">
          <h3>密码设置</h3>
          
          <!-- 密码 -->
          <div class="form-group">
            <label for="password">密码 *</label>
            <div class="password-input">
              <input
                id="password"
                v-model="registerForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码（至少6个字符）"
                :class="{ 'error': errors.password }"
                @blur="validateField('password')"
                @input="clearFieldError('password')"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '隐藏' : '显示' }}
              </button>
            </div>
            <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
            
            <!-- 密码强度指示器 -->
            <div class="password-strength">
              <div class="strength-bar">
                <div 
                  class="strength-fill"
                  :class="passwordStrengthClass"
                  :style="{ width: passwordStrengthWidth }"
                ></div>
              </div>
              <span class="strength-text">{{ passwordStrengthText }}</span>
            </div>
          </div>
          
          <!-- 确认密码 -->
          <div class="form-group">
            <label for="confirmPassword">确认密码 *</label>
            <div class="password-input">
              <input
                id="confirmPassword"
                v-model="registerForm.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入密码"
                :class="{ 'error': errors.confirmPassword }"
                @blur="validateField('confirmPassword')"
                @input="clearFieldError('confirmPassword')"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                {{ showConfirmPassword ? '隐藏' : '显示' }}
              </button>
            </div>
            <span v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</span>
          </div>
        </div>
        
        <!-- 协议同意 -->
        <div class="form-section">
          <div class="agreement-group">
            <label class="checkbox-label">
              <input
                v-model="registerForm.agreeToTerms"
                type="checkbox"
                :class="{ 'error': errors.agreeToTerms }"
              />
              <span class="checkbox-text">
                我已阅读并同意
                <a href="#" @click.prevent="showTerms">《用户协议》</a>
                和
                <a href="#" @click.prevent="showPrivacy">《隐私政策》</a>
              </span>
            </label>
            <span v-if="errors.agreeToTerms" class="field-error">{{ errors.agreeToTerms }}</span>
          </div>
        </div>
        
        <!-- 注册按钮 -->
        <div class="form-group">
          <button
            type="submit"
            class="register-button"
            :disabled="isLoading || !isFormValid"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            {{ isLoading ? '注册中...' : '立即注册' }}
          </button>
        </div>
        
        <!-- 登录链接 -->
        <div class="form-group login-link">
          <span>已有账号？</span>
          <a href="#" @click.prevent="showLogin">立即登录</a>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { validateField, validateEmail, validateUsername, validatePassword } from '../utils/authUtils.js';

export default {
  name: 'RegisterForm',
  
  data() {
    return {
      // 表单数据
      registerForm: {
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
      },
      
      // 表单验证错误
      errors: {},
      
      // UI状态
      showPassword: false,
      showConfirmPassword: false,
      registerSuccess: false,
      
      // 表单验证规则
      validationRules: {
        username: [
          { required: true },
          { minLength: 3 },
          { maxLength: 20 },
          { pattern: /^[a-zA-Z0-9_-]+$/ }
        ],
        email: [
          { required: true },
          { email: true }
        ],
        firstName: [
          { required: true },
          { minLength: 1 },
          { maxLength: 50 }
        ],
        lastName: [
          { required: true },
          { minLength: 1 },
          { maxLength: 50 }
        ],
        password: [
          { required: true },
          { minLength: 6 }
        ],
        confirmPassword: [
          { required: true },
          { 
            custom: (value) => {
              return value === this.registerForm.password || '两次输入的密码不一致';
            }
          }
        ],
        agreeToTerms: [
          {
            custom: (value) => {
              return value === true || '请先同意用户协议和隐私政策';
            }
          }
        ]
      }
    };
  },
  
  computed: {
    ...mapState('auth', [
      'isLoading',
      'registerError'
    ]),
    
    // 表单是否有效
    isFormValid() {
      const formFilled = this.registerForm.username && 
                        this.registerForm.email && 
                        this.registerForm.firstName &&
                        this.registerForm.lastName &&
                        this.registerForm.password && 
                        this.registerForm.confirmPassword &&
                        this.registerForm.agreeToTerms;
      
      return formFilled && Object.keys(this.errors).length === 0;
    },
    
    // 密码强度
    passwordStrength() {
      const password = this.registerForm.password;
      if (!password) return 0;
      
      let strength = 0;
      
      // 长度检查
      if (password.length >= 6) strength += 1;
      if (password.length >= 8) strength += 1;
      
      // 复杂度检查
      if (/[a-z]/.test(password)) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
      
      return Math.min(strength, 4);
    },
    
    passwordStrengthText() {
      const texts = ['', '弱', '一般', '强', '很强'];
      return texts[this.passwordStrength] || '';
    },
    
    passwordStrengthClass() {
      const classes = ['', 'weak', 'fair', 'good', 'strong'];
      return classes[this.passwordStrength] || '';
    },
    
    passwordStrengthWidth() {
      return `${(this.passwordStrength / 4) * 100}%`;
    }
  },
  
  methods: {
    ...mapActions('auth', [
      'register',
      'clearErrors'
    ]),
    
    // 处理注册提交
    async handleRegister() {
      // 验证表单
      if (!this.validateForm()) {
        return;
      }
      
      try {
        const result = await this.register(this.registerForm);
        
        if (result.success) {
          this.registerSuccess = true;
          // 3秒后跳转到登录页面
          setTimeout(() => {
            this.showLogin();
          }, 3000);
        }
      } catch (error) {
        console.error('注册失败:', error);
      }
    },
    
    // 验证整个表单
    validateForm() {
      this.errors = {};
      let isValid = true;
      
      // 遍历所有字段进行验证
      Object.keys(this.validationRules).forEach(fieldName => {
        const error = this.validateSingleField(fieldName);
        if (error) {
          this.errors[fieldName] = error;
          isValid = false;
        }
      });
      
      return isValid;
    },
    
    // 验证单个字段
    validateField(fieldName) {
      const error = this.validateSingleField(fieldName);
      if (error) {
        this.$set(this.errors, fieldName, error);
      } else {
        this.$delete(this.errors, fieldName);
      }
    },
    
    // 验证单个字段的具体逻辑
    validateSingleField(fieldName) {
      const value = this.registerForm[fieldName];
      const rules = this.validationRules[fieldName];
      
      if (!rules) return null;
      
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
          if (fieldName === 'username') {
            return '用户名只能包含字母、数字、下划线和连字符';
          }
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
      
      return null;
    },
    
    // 清除字段错误
    clearFieldError(fieldName) {
      if (this.errors[fieldName]) {
        this.$delete(this.errors, fieldName);
      }
      
      // 清除全局错误
      this.clearErrors();
    },
    
    // 显示登录页面
    showLogin() {
      this.$emit('show-login');
    },
    
    // 显示用户协议
    showTerms() {
      // 打开用户协议模态框或页面
      window.open('/terms', '_blank');
    },
    
    // 显示隐私政策
    showPrivacy() {
      // 打开隐私政策模态框或页面
      window.open('/privacy', '_blank');
    },
    
    // 重置表单
    resetForm() {
      this.registerForm = {
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
      };
      this.errors = {};
      this.registerSuccess = false;
      this.showPassword = false;
      this.showConfirmPassword = false;
    }
  },
  
  // 组件销毁时清理
  beforeDestroy() {
    this.clearErrors();
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h2 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.register-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.error-message, .success-message {
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.success-message {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0369a1;
}

.form-section {
  margin-bottom: 30px;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #374151;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 8px;
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
.form-group input[type="email"],
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

.name-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
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

.field-error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.field-hint {
  color: #6b7280;
  font-size: 12px;
  margin-top: 4px;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}

.strength-fill.weak {
  background: #dc2626;
}

.strength-fill.fair {
  background: #f59e0b;
}

.strength-fill.good {
  background: #10b981;
}

.strength-fill.strong {
  background: #059669;
}

.strength-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  display: block;
}

.agreement-group {
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.5;
}

.checkbox-label input {
  margin-right: 8px;
  margin-top: 2px;
  flex-shrink: 0;
}

.checkbox-label a {
  color: #3b82f6;
  text-decoration: none;
}

.checkbox-label a:hover {
  text-decoration: underline;
}

.register-button {
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

.register-button:hover:not(:disabled) {
  background: #2563eb;
}

.register-button:disabled {
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

.login-link {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

.login-link a {
  color: #3b82f6;
  text-decoration: none;
  margin-left: 4px;
}

.login-link a:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-container {
    padding: 10px;
  }
  
  .register-card {
    padding: 30px 20px;
  }
  
  .name-group {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>