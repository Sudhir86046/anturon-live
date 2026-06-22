'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && (user as any)?.organization?.slug) {
        router.replace(`/${(user as any).organization.slug}/dashboard`);
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-anturon-500 border-t-transparent"></div>
        <p className="text-sm text-slate-500">Redirecting...</p>
      </div>
    </div>
  );
}
