'use client';
import { capitalize } from '@/utils/format';
export function StatusBadge({ status }: { status?: string }) { if(!status) return null; return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{capitalize(status)}</span>; }
