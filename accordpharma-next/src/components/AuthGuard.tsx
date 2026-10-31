'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const PUBLIC_ROUTES = ['/login', '/reset-password', '/forgot-password'];

/**
 * Inner component that uses hooks — must be wrapped in Suspense
 * because usePathname() and useRouter() can block prerendering.
 */
function AuthGuardInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublic) {
      router.replace(`/login${pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''}`);
    } else {
      setReady(true);
    }
  }, [isAuthenticated, isLoading, isPublic, pathname, router]);

  // Public pages render immediately
  if (isPublic) return <>{children}</>;

  // Show spinner while hydrating
  if (isLoading || !ready) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Loading Accord Pharma...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Exported AuthGuard wraps the inner component in Suspense to satisfy
 * Next.js prerendering requirements for hooks like usePathname().
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}
