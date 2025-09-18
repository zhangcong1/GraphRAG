<template>
  <div class="user-profile">
    <div class="profile-container">
      <!-- 用户头像和基本信息 -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <img 
              :src="user.avatar || defaultAvatar" 
              :alt="userDisplayName"
              class="user-avatar"
            />
            <button 
              class="avatar-upload-btn"
              @click="triggerAvatarUpload"
              title="更换头像"
            >
              <i class="icon-camera"></i>
            </button>
            <input 
              ref="avatarInput"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="handleAvatarUpload"
            />
          </div>
        </div>
        
        <div class="user-info">
          <h2 class="user-name">{{ userDisplayName }}</h2>
          <p class="user-role">{{ roleDisplayName }}</p>
          <p class="user-email">{{ user.email }}</p>
          <div class="user-status">
            <span :class="['status-badge', user.isActive ? 'active' : 'inactive']">
              {{ user.isActive ? '活跃' : '未激活' }}
            </span>
          </div>
        </div>
        
        <div class="profile-actions">
          <button 
            class="btn btn-primary"
            @click="editMode = !editMode"
          >
            {{ editMode ? '取消编辑' : '编辑资料' }}
          </button>
          <button 
            class="btn btn-secondary"
            @click="showChangePassword = true"
          >
            修改密码
          </button>
        </div>
      </div>
      
      <!-- 用户详细信息 -->
      <div class="profile-content">
        <!-- 基本信息卡片 -->
        <div class="info-card">
          <h3 class="card-title">基本信息</h3>
          
          <div v-if="!editMode" class="info-display">
            <div class="info-item">
              <label>用户名</label>
              <span>{{ user.username }}</span>
            </div>
            <div class="info-item">
              <label>姓名</label>
              <span>{{ user.firstName }} {{ user.lastName }}</span>
            </div>
            <div class="info-item">
              <label>邮箱</label>
              <span>{{ user.email }}</span>
            </div>
            <div class="info-item">
              <label>注册时间</label>
              <span>{{ formatDate(user.createdAt) }}</span>
            </div>
            <div class="info-item">
              <label>最后登录</label>
              <span>{{ formatLastLogin(user.lastLoginAt) }}</span>
            </div>
          </div>
          
          <!-- 编辑模式 -->
          <form v-else @submit.prevent="updateProfile" class="edit-form">
            <div class="form-group">
              <label for="firstName">姓</label>
              <input
                id="firstName"
                v-model="editForm.firstName"
                type="text"
                :class="{ 'error': errors.firstName }"
                @blur="validateField('firstName')"
              />
              <span v-if="errors.firstName" class="field-error">{{ errors.firstName }}</span>
            </div>
            
            <div class="form-group">
              <label for="lastName">名</label>
              <input
                id="lastName"
                v-model="editForm.lastName"
                type="text"
                :class="{ 'error': errors.lastName }"
                @blur="validateField('lastName')"
              />
              <span v-if="errors.lastName" class="field-error">{{ errors.lastName }}</span>
            </div>
            
            <div class="form-group">
              <label for="email">邮箱</label>
              <input
                id="email"
                v-model="editForm.email"
                type="email"
                :class="{ 'error': errors.email }"
                @blur="validateField('email')"
              />
              <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="isLoading || !isFormValid"
              >
                <span v-if="isLoading" class="loading-spinner"></span>
                {{ isLoading ? '保存中...' : '保存更改' }}
              </button>
              <button 
                type="button" 
                class="btn btn-secondary"
                @click="cancelEdit"
              >
                取消
              </button>
            </div>
          </form>
        </div>
        
        <!-- 权限信息卡片 -->
        <div class="info-card">
          <h3 class="card-title">权限信息</h3>
          <div class="permissions-list">
            <div v-if="userPermissions.length === 0" class="no-permissions">
              暂无特殊权限
            </div>
            <div 
              v-for="permission in userPermissions" 
              :key="permission.id"
              class="permission-item"
            >
              <div class="permission-info">
                <strong>{{ permission.name }}</strong>
                <span class="permission-code">{{ permission.code }}</span>
              </div>
              <div class="permission-scope">
                {{ permission.resource }} - {{ permission.action }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 账户统计 -->
        <div class="info-card">
          <h3 class="card-title">账户统计</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ loginStats.totalLogins || 0 }}</div>
              <div class="stat-label">总登录次数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ loginStats.consecutiveDays || 0 }}</div>
              <div class="stat-label">连续登录天数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ accountAge }}</div>
              <div class="stat-label">账户年龄</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 修改密码模态框 -->
    <div v-if="showChangePassword" class="modal-overlay" @click="closePasswordModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>修改密码</h3>
          <button class="modal-close" @click="closePasswordModal">&times;</button>
        </div>
        
        <form @submit.prevent="changePassword" class="password-form">
          <div class="form-group">
            <label for="currentPassword">当前密码</label>
            <input
              id="currentPassword"
              v-model="passwordForm.currentPassword"
              type="password"
              placeholder="请输入当前密码"
              :class="{ 'error': passwordErrors.currentPassword }"
            />
            <span v-if="passwordErrors.currentPassword" class="field-error">
              {{ passwordErrors.currentPassword }}
            </span>
          </div>
          
          <div class="form-group">
            <label for="newPassword">新密码</label>
            <input
              id="newPassword"
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              :class="{ 'error': passwordErrors.newPassword }"
            />
            <span v-if="passwordErrors.newPassword" class="field-error">
              {{ passwordErrors.newPassword }}
            </span>
          </div>
          
          <div class="form-group">
            <label for="confirmNewPassword">确认新密码</label>
            <input
              id="confirmNewPassword"
              v-model="passwordForm.confirmNewPassword"
              type="password"
              placeholder="请再次输入新密码"
              :class="{ 'error': passwordErrors.confirmNewPassword }"
            />
            <span v-if="passwordErrors.confirmNewPassword" class="field-error">
              {{ passwordErrors.confirmNewPassword }}
            </span>
          </div>
          
          <div class="modal-actions">
            <button 
              type="submit" 
              class="btn btn-primary"
              :disabled="isPasswordLoading || !isPasswordFormValid"
            >
              <span v-if="isPasswordLoading" class="loading-spinner"></span>
              {{ isPasswordLoading ? '修改中...' : '确认修改' }}
            </button>
            <button 
              type="button" 
              class="btn btn-secondary"
              @click="closePasswordModal"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { validateEmail, formatLastLogin, validatePassword } from '../utils/authUtils.js';

export default {
  name: 'UserProfile',
  
  data() {
    return {
      // 编辑状态
      editMode: false,
      
      // 编辑表单
      editForm: {
        firstName: '',
        lastName: '',
        email: ''
      },
      
      // 表单验证错误
      errors: {},
      
      // 密码修改
      showChangePassword: false,
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      },
      passwordErrors: {},
      isPasswordLoading: false,
      
      // 默认头像
      defaultAvatar: '/images/default-avatar.png',
      
      // 登录统计（模拟数据）
      loginStats: {
        totalLogins: 156,
        consecutiveDays: 7
      }
    };
  },
  
  computed: {
    ...mapState('auth', [
      'user',
      'isLoading'
    ]),
    
    ...mapGetters('auth', [
      'userDisplayName',
      'userPermissions',
      'userRole'
    ]),
    
    // 角色显示名称
    roleDisplayName() {
      const roleMap = {
        'admin': '管理员',
        'user': '普通用户',
        'moderator': '版主',
        'guest': '访客'
      };
      return roleMap[this.userRole] || this.userRole;
    },
    
    // 账户年龄
    accountAge() {
      if (!this.user.createdAt) return '未知';
      
      const created = new Date(this.user.createdAt);
      const now = new Date();
      const diffInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      
      if (diffInDays < 30) return `${diffInDays} 天`;
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} 个月`;
      return `${Math.floor(diffInDays / 365)} 年`;
    },
    
    // 编辑表单是否有效
    isFormValid() {
      return this.editForm.firstName &&
             this.editForm.lastName &&
             this.editForm.email &&
             Object.keys(this.errors).length === 0;
    },
    
    // 密码表单是否有效
    isPasswordFormValid() {
      return this.passwordForm.currentPassword &&
             this.passwordForm.newPassword &&
             this.passwordForm.confirmNewPassword &&
             Object.keys(this.passwordErrors).length === 0;
    }
  },
  
  watch: {
    // 监听用户数据变化，初始化编辑表单
    user: {
      handler(newUser) {
        if (newUser) {
          this.initEditForm();
        }
      },
      immediate: true
    }
  },
  
  methods: {
    ...mapActions('auth', [
      'updateProfile',
      'changePassword'
    ]),
    
    // 初始化编辑表单
    initEditForm() {
      if (this.user) {
        this.editForm = {
          firstName: this.user.firstName || '',
          lastName: this.user.lastName || '',
          email: this.user.email || ''
        };
      }
    },
    
    // 更新用户资料
    async updateProfile() {
      if (!this.validateEditForm()) {
        return;
      }
      
      try {
        const result = await this.$store.dispatch('auth/updateProfile', this.editForm);
        
        if (result.success) {
          this.editMode = false;
          this.$message({
            type: 'success',
            message: '资料更新成功！'
          });
        } else {
          this.$message({
            type: 'error',
            message: result.message || '更新失败'
          });
        }
      } catch (error) {
        this.$message({
          type: 'error',
          message: '更新过程中发生错误'
        });
      }
    },
    
    // 验证编辑表单
    validateEditForm() {
      this.errors = {};
      
      if (!this.editForm.firstName) {
        this.errors.firstName = '姓不能为空';
      }
      
      if (!this.editForm.lastName) {
        this.errors.lastName = '名不能为空';
      }
      
      if (!this.editForm.email) {
        this.errors.email = '邮箱不能为空';
      } else if (!validateEmail(this.editForm.email)) {
        this.errors.email = '邮箱格式不正确';
      }
      
      return Object.keys(this.errors).length === 0;
    },
    
    // 验证单个字段
    validateField(fieldName) {
      const value = this.editForm[fieldName];
      
      switch (fieldName) {
        case 'firstName':
        case 'lastName':
          if (!value || !value.trim()) {
            this.$set(this.errors, fieldName, '此字段不能为空');
          } else {
            this.$delete(this.errors, fieldName);
          }
          break;
        case 'email':
          if (!value) {
            this.$set(this.errors, fieldName, '邮箱不能为空');
          } else if (!validateEmail(value)) {
            this.$set(this.errors, fieldName, '邮箱格式不正确');
          } else {
            this.$delete(this.errors, fieldName);
          }
          break;
      }
    },
    
    // 取消编辑
    cancelEdit() {
      this.editMode = false;
      this.initEditForm();
      this.errors = {};
    },
    
    // 头像上传
    triggerAvatarUpload() {
      this.$refs.avatarInput.click();
    },
    
    handleAvatarUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // 验证文件类型和大小
      if (!file.type.startsWith('image/')) {
        this.$message({
          type: 'error',
          message: '请选择图片文件'
        });
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB
        this.$message({
          type: 'error',
          message: '图片大小不能超过2MB'
        });
        return;
      }
      
      // 这里应该上传到服务器
      // 暂时使用本地预览
      const reader = new FileReader();
      reader.onload = (e) => {
        // 更新用户头像（实际应该调用API）
        this.$message({
          type: 'success',
          message: '头像上传成功！'
        });
      };
      reader.readAsDataURL(file);
    },
    
    // 修改密码
    async changePassword() {
      if (!this.validatePasswordForm()) {
        return;
      }
      
      this.isPasswordLoading = true;
      
      try {
        const result = await this.$store.dispatch('auth/changePassword', {
          currentPassword: this.passwordForm.currentPassword,
          newPassword: this.passwordForm.newPassword
        });
        
        if (result.success) {
          this.closePasswordModal();
          this.$message({
            type: 'success',
            message: '密码修改成功！'
          });
        } else {
          this.$message({
            type: 'error',
            message: result.message || '密码修改失败'
          });
        }
      } catch (error) {
        this.$message({
          type: 'error',
          message: '修改密码过程中发生错误'
        });
      } finally {
        this.isPasswordLoading = false;
      }
    },
    
    // 验证密码表单
    validatePasswordForm() {
      this.passwordErrors = {};
      
      if (!this.passwordForm.currentPassword) {
        this.passwordErrors.currentPassword = '请输入当前密码';
      }
      
      if (!this.passwordForm.newPassword) {
        this.passwordErrors.newPassword = '请输入新密码';
      } else {
        const error = validatePassword(this.passwordForm.newPassword);
        if (error) {
          this.passwordErrors.newPassword = error;
        }
      }
      
      if (!this.passwordForm.confirmNewPassword) {
        this.passwordErrors.confirmNewPassword = '请确认新密码';
      } else if (this.passwordForm.newPassword !== this.passwordForm.confirmNewPassword) {
        this.passwordErrors.confirmNewPassword = '两次输入的密码不一致';
      }
      
      return Object.keys(this.passwordErrors).length === 0;
    },
    
    // 关闭密码修改模态框
    closePasswordModal() {
      this.showChangePassword = false;
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      };
      this.passwordErrors = {};
    },
    
    // 格式化日期
    formatDate(date) {
      if (!date) return '未知';
      return new Date(date).toLocaleDateString('zh-CN');
    },
    
    // 格式化最后登录时间
    formatLastLogin
  }
};
</script>

<style scoped>
.user-profile {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.profile-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  display: flex;
  align-items: center;
  gap: 30px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
}

.user-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.2);
  object-fit: cover;
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: 2px solid white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
}

.user-name {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.user-role {
  margin: 0 0 4px 0;
  font-size: 16px;
  opacity: 0.9;
}

.user-email {
  margin: 0 0 16px 0;
  font-size: 14px;
  opacity: 0.8;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-badge.inactive {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.profile-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.profile-content {
  padding: 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.info-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 30px;
}

.info-card:first-child {
  grid-column: 1 / -1;
}

.card-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.info-display {
  display: grid;
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  font-weight: 500;
  color: #6b7280;
}

.info-item span {
  color: #374151;
}

.edit-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
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

.field-error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 10px;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-permissions {
  color: #6b7280;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.permission-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
}

.permission-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.permission-code {
  background: #f3f4f6;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.permission-scope {
  color: #6b7280;
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 8px;
}

.stat-label {
  color: #6b7280;
  font-size: 14px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #374151;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
}

.password-form {
  padding: 20px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .profile-actions {
    flex-direction: row;
  }
  
  .profile-content {
    grid-template-columns: 1fr;
    padding: 20px;
  }
  
  .edit-form {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}
</style>