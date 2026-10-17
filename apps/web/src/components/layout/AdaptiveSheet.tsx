import { useState, useEffect, type ReactNode } from 'react';
import HoloHeader from '@/components/layout/HoloHeader';

export interface AdaptiveSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  category?: string;
  children: ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  rightAction?: ReactNode;
  side?: 'left' | 'right' | 'center';
}

export default function AdaptiveSheet({
  open,
  onClose,
  title,
  category,
  children,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  rightAction,
  side = 'left',
}: AdaptiveSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!mounted && !open) return null;

  // Compute desktop position and animation classes based on side
  let desktopClasses = '';
  if (side === 'right') {
    desktopClasses = `sm:top-16 sm:right-4 sm:bottom-20 sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl ${
      open
        ? 'sm:translate-x-0 sm:opacity-100 sm:scale-100'
        : 'sm:translate-x-6 sm:opacity-0 sm:scale-95 sm:pointer-events-none'
    }`;
  } else if (side === 'center') {
    desktopClasses = `sm:top-16 sm:bottom-20 sm:left-1/2 sm:w-[500px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl ${
      open
        ? 'sm:-translate-x-1/2 sm:translate-y-0 sm:opacity-100 sm:scale-100'
        : 'sm:-translate-x-1/2 sm:translate-y-4 sm:opacity-0 sm:scale-95 sm:pointer-events-none'
    }`;
  } else {
    // Left (default)
    desktopClasses = `sm:top-16 sm:left-4 sm:bottom-20 sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl ${
      open
        ? 'sm:translate-x-0 sm:opacity-100 sm:scale-100'
        : 'sm:-translate-x-6 sm:opacity-0 sm:scale-95 sm:pointer-events-none'
    }`;
  }

  return (
    <>
      {/* Dimmed backdrop overlay */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />

      {/* Adaptive Sheet: Desktop Left/Right/Center Docked Glass Card / Mobile Bottom Sheet */}
      <aside
        className={`fixed z-40 flex flex-col cyber-glass-heavy border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.15)] transition-all duration-300 ease-out overflow-hidden
          ${desktopClasses}
          max-sm:bottom-20 max-sm:left-3 max-sm:right-3 max-sm:max-h-[78dvh] max-sm:rounded-3xl
          ${
            open
              ? 'max-sm:translate-y-0 max-sm:opacity-100'
              : 'max-sm:translate-y-12 max-sm:opacity-0 max-sm:pointer-events-none'
          }
        `}
      >
        {/* Holographic Header Bar */}
        <HoloHeader
          title={title}
          category={category}
          onClose={onClose}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          rightAction={rightAction}
        />

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 text-slate-700">
          {children}
        </div>
      </aside>
    </>
  );
}
