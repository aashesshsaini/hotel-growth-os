import axios, { AxiosRequestConfig } from 'axios';
import { API_URL } from './constants';
import { storage } from '@/utils/storage';

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => { const token = storage.get('token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((res) => res, (error) => { const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Request failed'; return Promise.reject(new Error(message)); });
const unwrap = <T>(promise: Promise<{ data: unknown }>): Promise<T> => promise.then((res) => {
  const payload = res.data as { success?: boolean; data?: T };
  return payload && typeof payload === 'object' && 'data' in payload ? (payload.data as T) : (res.data as T);
});
export const apiGet = <T>(url: string, params?: unknown, config?: AxiosRequestConfig) => unwrap<T>(api.get(url, { ...config, params }));
export const apiPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => unwrap<T>(api.post(url, data, config));
export const apiPut = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => unwrap<T>(api.put(url, data, config));
export const apiPatch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => unwrap<T>(api.patch(url, data, config));
export const apiDelete = <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(api.delete(url, config));
export default api;
