'use client';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { getProfile, login as loginApi } from '@/services/auth.service';
import { storage } from '@/utils/storage';
interface AuthContextValue { user: User | null; isLoading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; }
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) { const [user,setUser]=useState<User|null>(null); const [isLoading,setLoading]=useState(true); useEffect(()=>{ const token=storage.get('token'); if(!token){setLoading(false);return;} getProfile().then(setUser).catch(()=>storage.remove('token')).finally(()=>setLoading(false));},[]); const login=useCallback(async(email:string,password:string)=>{ const res=await loginApi(email,password); storage.set('token',res.token); setUser(res.user);},[]); const logout=useCallback(()=>{storage.remove('token'); setUser(null);},[]); const value=useMemo(()=>({user,isLoading,login,logout}),[user,isLoading,login,logout]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; }
