'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token found. Please use the link from your email.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/api/trpc/auth.verifyEmail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json: { token } }),
        });
        const data = await res.json();

        if (data?.error) {
          throw new Error(data.error.json?.message || 'Verification failed');
        }

        setStatus('success');
        setTimeout(() => router.replace('/login'), 3000);
      } catch (e: any) {
        setStatus('error');
        setError(e.message || 'Verification failed');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-10 text-center space-y-4">
            {/* Logo */}
            <div className="flex justify-center items-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-anturon-500">
                <svg viewBox="0 0 36 36" className="h-6 w-6">
                  <path d="M22 8 L12 20 H20 L18 28 L28 16 H20 L22 8 Z" fill="white"/>
                </svg>
              </div>
              <span className="text-2xl font-semibold text-anturon-500">anturon</span>
            </div>

            {status === 'verifying' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-anturon-500 mx-auto" />
                <p className="text-xl font-semibold text-slate-900">Verifying your email...</p>
                <p className="text-slate-500 text-sm">Please wait a moment</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
                <p className="text-xl font-semibold text-slate-900">Email Verified!</p>
                <p className="text-slate-500 text-sm">
                  Your account is now active. Redirecting to sign in...
                </p>
                <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-14 w-14 text-red-500 mx-auto" />
                <p className="text-xl font-semibold text-slate-900">Verification Failed</p>
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
                <Link href="/login" className="inline-block text-sm text-anturon-500 hover:underline">
                  Back to Sign In
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-anturon-500" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
