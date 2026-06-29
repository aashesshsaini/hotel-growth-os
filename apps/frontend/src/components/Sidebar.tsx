'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavigationSections, getProductSurface, PRODUCT_COPY } from '@/config/productExperience';
import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {
  const path = usePathname();
  const { user } = useAuth();
  const surface = getProductSurface(user?.role);
  const product = PRODUCT_COPY[surface];
  const sections = getNavigationSections(user?.role);

  return (
    <aside className="hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:block">
      <div className={`mb-6 rounded-2xl p-4 text-white ${surface === 'platform' ? 'bg-gradient-to-br from-slate-900 to-indigo-900' : 'bg-gradient-to-br from-indigo-600 to-slate-950'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{product.badge}</p>
        <p className="mt-2 font-bold">{product.title}</p>
        <p className="mt-1 text-xs text-white/75">{product.subtitle}</p>
      </div>
      <nav className="space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = path === href || (href !== '/dashboard' && path.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
