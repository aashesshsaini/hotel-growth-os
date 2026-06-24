'use client';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
export function DashboardLayout({ children }: { children: React.ReactNode }) { return <ProtectedRoute><div className="flex min-h-screen bg-slate-50"><Sidebar /><div className="min-w-0 flex-1"><Header /><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div></ProtectedRoute>; }
