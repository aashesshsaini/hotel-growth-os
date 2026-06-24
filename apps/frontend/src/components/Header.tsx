'use client';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
export function Header() { const { user, logout } = useAuth(); return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">Hotel Growth OS</p><p className="text-xs text-slate-500">{user?.name || user?.email || 'Dashboard'}</p></div><button className="btn-secondary !px-3 !py-1.5" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</button></div></header>; }
