'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, CheckCircle, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/trpc/auth.resetPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { token, newPassword: password } }),
      });
      const data = await res.json();

      if (data?.error) {
        throw new Error(data.error.json?.message || 'Reset failed');
      }

      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2500);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4 py-4">
        <p className="text-red-600 font-medium">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-anturon-500 hover:underline text-sm">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success ? (
        <div className="text-center space-y-4 py-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <p className="text-slate-700 font-medium">Password updated!</p>
          <p className="text-sm text-slate-500">Redirecting to sign in...</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Lock className="inline h-4 w-4 mr-2" />
              New Password
            </label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Lock className="inline h-4 w-4 mr-2" />
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-anturon-500 hover:bg-anturon-600"
          >
            {isLoading ? 'Updating...' : 'Reset Password'}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          <div className="text-center">
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
              Back to Sign In
            </Link>
          </div>
        </>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex justify-center items-center w-full mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-anturon-500">
                  <svg viewBox="0 0 36 36" className="h-6 w-6">
                    <path d="M22 8 L12 20 H20 L18 28 L28 16 H20 L22 8 Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-2xl font-semibold text-anturon-500">anturon</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <Suspense fallback={<div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-anturon-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
