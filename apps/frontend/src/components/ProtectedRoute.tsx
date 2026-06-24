'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from './LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
export function ProtectedRoute({ children }: { children: React.ReactNode }) { const { user, isLoading }=useAuth(); const router=useRouter(); useEffect(()=>{ if(!isLoading && !user) router.replace('/login'); },[isLoading,user,router]); if(isLoading || !user) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>; return <>{children}</>; }
