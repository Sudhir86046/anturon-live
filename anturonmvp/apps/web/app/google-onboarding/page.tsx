'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';
import { Building2, ArrowRight, CheckCircle } from 'lucide-react';

const industries = [
  { id: 'retail', name: 'Retail', icon: '🛍️' },
  { id: 'real_estate', name: 'Real Estate', icon: '🏢' },
  { id: 'ecommerce', name: 'E-commerce', icon: '📦' },
  { id: 'fintech', name: 'Fintech', icon: '💳' },
  { id: 'banking', name: 'Banking', icon: '🏦' },
  { id: 'other', name: 'Other', icon: '🏭' },
];

const regions = [
  { id: 'uae', name: 'UAE (Dubai)', flag: '🇦🇪' },
  { id: 'saudi', name: 'Saudi Arabia', flag: '🇸🇦' },
  { id: 'india', name: 'India', flag: '🇮🇳' },
  { id: 'other', name: 'Other', flag: '🌍' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function GoogleOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle } = useAuth();

  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || '';
  const gid = searchParams.get('gid') || '';

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');

  const handleFinish = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/trpc/auth.googleRegister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: { email, name, googleId: gid, organizationName: orgName, industry, region },
        }),
      });
      const data = await res.json();
      const result = data?.result?.data?.json;
      if (!result?.token) throw new Error(data?.error?.json?.message || 'Registration failed');
      const slug = await loginWithGoogle(result.token);
      router.replace(`/${slug}`);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
            <CardTitle className="text-2xl font-bold">
              {step === 1 ? 'Name Your Organization' : 'About Your Business'}
            </CardTitle>
            <CardDescription className="text-slate-500">
              Welcome, {name}! Just two quick steps to set up your workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <div className="flex items-center justify-center gap-4 mb-8">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm',
                    step === i ? 'bg-indigo-600 text-white' :
                    step > i ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                  )}>
                    {step > i ? <CheckCircle className="h-5 w-5" /> : i}
                  </div>
                  {i < 2 && <div className={cn('w-16 h-1 rounded-full', step > i ? 'bg-green-500' : 'bg-slate-200')} />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Building2 className="inline h-4 w-4 mr-2" />
                    Organization Name
                  </label>
                  <Input
                    placeholder="e.g., Dubai Real Estate Co."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Slug: {orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'your-org'}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!orgName.trim()}
                    className="bg-anturon-500 hover:bg-anturon-600"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Industry</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {industries.map((ind) => (
                      <button key={ind.id} type="button" onClick={() => setIndustry(ind.id)}
                        className={cn('p-4 rounded-xl border-2 text-left transition-all',
                          industry === ind.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                        )}>
                        <span className="text-2xl mb-2 block">{ind.icon}</span>
                        <span className="text-sm font-medium">{ind.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Region</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {regions.map((reg) => (
                      <button key={reg.id} type="button" onClick={() => setRegion(reg.id)}
                        className={cn('p-4 rounded-xl border-2 text-center transition-all',
                          region === reg.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                        )}>
                        <span className="text-2xl mb-1 block">{reg.flag}</span>
                        <span className="text-xs font-medium">{reg.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    onClick={handleFinish}
                    disabled={!industry || !region || isLoading}
                    className="bg-anturon-500 hover:bg-anturon-600"
                  >
                    {isLoading ? 'Creating...' : 'Launch Dashboard'}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GoogleOnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-anturon-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <GoogleOnboardingForm />
    </Suspense>
  );
}
