'use client';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getProductSurface, PRODUCT_COPY } from '@/config/productExperience';
import { endPlatformImpersonation } from '@/services/platform.service';
import { storage } from '@/utils/storage';

export function Header() {
  const { user, logout } = useAuth();
  const surface = getProductSurface(user?.role);
  const product = PRODUCT_COPY[surface];
  const isImpersonating = typeof window !== 'undefined' && Boolean(storage.get('platform_token'));

  const exitImpersonation = async () => {
    const platformToken = storage.get('platform_token');
    const sessionId = storage.get('impersonation_session_id');
    if (!platformToken) return;
    storage.set('token', platformToken);
    storage.remove('platform_token');
    storage.remove('impersonation_session_id');
    storage.remove('impersonated_hotel_name');
    if (sessionId) {
      try {
        await endPlatformImpersonation(sessionId);
      } catch {
        // Token restoration must not be blocked by audit-log network failure.
      }
    }
    window.location.href = '/dashboard';
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{product.title}</p>
          <p className="truncate text-xs text-slate-500">{user?.name || user?.email || product.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {isImpersonating && (
            <button className="btn-secondary !border-amber-300 !bg-amber-50 !px-3 !py-1.5 !text-amber-800" onClick={() => void exitImpersonation()}>
              Exit impersonation
            </button>
          )}
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
            {product.badge}
          </span>
          <button className="btn-secondary !px-3 !py-1.5" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
