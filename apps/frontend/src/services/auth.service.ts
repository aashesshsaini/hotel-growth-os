import { apiGet, apiPost } from '@/lib/api';
import type { AuthResponse, User } from '@/types';
export const login = (email: string, password: string) => apiPost<AuthResponse>('/auth/login', { email, password });
export const register = (payload: Record<string, unknown>) => apiPost<AuthResponse>('/auth/register', payload);
export const getProfile = () => apiGet<User>('/auth/profile');
