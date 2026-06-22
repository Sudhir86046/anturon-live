'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

export default function GoogleCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/login');
      return;
    }

    const s = session as any;

    if (s.isNewUser) {
      router.replace(
        `/google-onboarding?email=${encodeURIComponent(s.googleEmail)}&name=${encodeURIComponent(s.googleName)}&gid=${encodeURIComponent(s.googleId)}`
      );
    } else if (s.appToken) {
      loginWithGoogle(s.appToken).then((slug) => {
        router.replace(`/${slug}`);
      });
    } else {
      router.replace('/login');
    }
  }, [session, status]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-anturon-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
