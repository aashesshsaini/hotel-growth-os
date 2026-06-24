'use client';

import clsx from 'clsx';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
  hidden?: boolean;
  dividerBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: 'left' | 'right';
}

export function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.filter((item) => !item.hidden);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = visibleItems.length * 40 + 16;
    const gap = 6;

    let top = rect.bottom + gap;
    let left = align === 'right' ? rect.right - menuWidth : rect.left;

    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) left = 8;

    if (top + menuHeight > window.innerHeight - 8) {
      top = rect.top - menuHeight - gap;
    }
    if (top < 8) top = 8;

    setPosition({ top, left });
  }, [align, visibleItems.length]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    const handleScroll = () => close();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, close, updatePosition]);

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5"
          style={{ top: position.top, left: position.left }}
          role="menu"
        >
          {visibleItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={`${item.label}-${index}`}>
                {item.dividerBefore && index > 0 && (
                  <div className="my-1 border-t border-slate-100" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  className={clsx(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition',
                    item.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                  onClick={() => {
                    close();
                    item.onClick();
                  }}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                  <span className="font-medium">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open actions menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={clsx(
          'rounded-lg p-2 transition',
          open
            ? 'bg-brand-50 text-brand-600'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            close();
          } else {
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </>
  );
}
