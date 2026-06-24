import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/store/AuthProvider';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = { title: 'Hotel Growth OS', description: 'SaaS platform for Indian hotels' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></body></html>;
}
