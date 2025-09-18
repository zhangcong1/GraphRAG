/**
 * 认证系统相关类型定义
 */

export interface User {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    permissions: Permission[];
}

export interface LoginCredentials {
    username: string;
    password: string;
    rememberMe?: boolean;
    captcha?: string;
}

export interface RegisterForm {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    agreeToTerms: boolean;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    loginError: string | null;
}

export interface Permission {
    id: number;
    name: string;
    code: string;
    resource: string;
    action: string;
}

export interface LoginResponse {
    success: boolean;
    user: User;
    token: string;
    refreshToken: string;
    expiresIn: number;
    message?: string;
}

export interface ApiError {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
}

export type UserRole = 'admin' | 'user' | 'guest' | 'moderator';

export type AuthAction = 
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; payload: LoginResponse }
    | { type: 'LOGIN_FAILURE'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'UPDATE_USER'; payload: Partial<User> }
    | { type: 'SET_LOADING'; payload: boolean };

export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    email?: boolean;
    custom?: (value: any) => boolean | string;
}

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'checkbox';
    rules: ValidationRule[];
    placeholder?: string;
    value?: any;
    error?: string;
}