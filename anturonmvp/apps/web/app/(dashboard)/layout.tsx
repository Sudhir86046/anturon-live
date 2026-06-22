'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/components/providers/auth-provider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const slug = (params?.slug as string) || (user as any)?.organization?.slug || 'demo-org';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-anturon-500 border-t-transparent"></div>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const sidebarUser = user ? {
    name: user.name,
    email: user.email,
    role: user.role,
  } : undefined;

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <DashboardSidebar 
          organizationSlug={slug} 
          user={sidebarUser}
        />
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
