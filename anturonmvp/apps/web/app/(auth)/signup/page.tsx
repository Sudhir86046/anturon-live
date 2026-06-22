'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/auth-provider';
import { 
  Mic2, 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Phone,
  Globe,
  Briefcase,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    organizationName: '',
    industry: '',
    region: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register({
        organizationName: formData.organizationName,
        industry: formData.industry as any,
        region: formData.region as any,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        phone: formData.phone,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2 pt-8">
            {/* Logo - centered inside card */}
            <div className="flex justify-center items-center w-full mb-6">
              <div className="flex items-center gap-2">
                {/* Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-anturon-500">
                  <svg viewBox="0 0 36 36" className="h-6 w-6">
                    <path d="M22 8 L12 20 H20 L18 28 L28 16 H20 L22 8 Z" fill="white"/>
                  </svg>
                </div>
                {/* Wordmark */}
                <span className="text-2xl font-semibold text-anturon-500">anturon</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 1 && 'Create Your Organization'}
              {step === 2 && 'Tell Us About Your Business'}
              {step === 3 && 'Create Your Account'}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {step === 1 && 'Start your 14-day free trial. No credit card required.'}
              {step === 2 && 'Help us customize your AI agents for your industry.'}
              {step === 3 && 'You will be the admin of your organization.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm',
                    step === i ? 'bg-indigo-600 text-white' :
                    step > i ? 'bg-green-500 text-white' :
                    'bg-slate-200 text-slate-500'
                  )}>
                    {step > i ? <CheckCircle className="h-5 w-5" /> : i}
                  </div>
                  {i < 3 && (
                    <div className={cn(
                      'w-16 h-1 rounded-full',
                      step > i ? 'bg-green-500' : 'bg-slate-200'
                    )} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Building2 className="inline h-4 w-4 mr-2" />
                      Organization Name
                    </label>
                    <Input
                      placeholder="e.g., Dubai Real Estate Co."
                      value={formData.organizationName}
                      onChange={(e) => updateField('organizationName', e.target.value)}
                      className="h-12"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      This will be your subdomain: {formData.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'your-org'}.anturon.io
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!formData.organizationName}
                      className="bg-anturon-500 hover:bg-anturon-600"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      <Briefcase className="inline h-4 w-4 mr-2" />
                      Industry
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {industries.map((industry) => (
                        <button
                          key={industry.id}
                          type="button"
                          onClick={() => updateField('industry', industry.id)}
                          className={cn(
                            'p-4 rounded-xl border-2 text-left transition-all',
                            formData.industry === industry.id
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-slate-200 hover:border-indigo-300'
                          )}
                        >
                          <span className="text-2xl mb-2 block">{industry.icon}</span>
                          <span className="text-sm font-medium">{industry.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      <Globe className="inline h-4 w-4 mr-2" />
                      Region
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {regions.map((region) => (
                        <button
                          key={region.id}
                          type="button"
                          onClick={() => updateField('region', region.id)}
                          className={cn(
                            'p-4 rounded-xl border-2 text-center transition-all',
                            formData.region === region.id
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-slate-200 hover:border-indigo-300'
                          )}
                        >
                          <span className="text-2xl mb-1 block">{region.flag}</span>
                          <span className="text-xs font-medium">{region.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!formData.industry || !formData.region}
                      className="bg-anturon-500 hover:bg-anturon-600"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <User className="inline h-4 w-4 mr-2" />
                        Full Name
                      </label>
                      <Input
                        placeholder="John Doe"
                        value={formData.adminName}
                        onChange={(e) => updateField('adminName', e.target.value)}
                        className="h-12"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Phone className="inline h-4 w-4 mr-2" />
                        Phone (Optional)
                      </label>
                      <Input
                        placeholder="+971 XX XXX XXXX"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={formData.adminEmail}
                      onChange={(e) => updateField('adminEmail', e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Lock className="inline h-4 w-4 mr-2" />
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.adminPassword}
                      onChange={(e) => updateField('adminPassword', e.target.value)}
                      className="h-12"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <input type="checkbox" id="terms" required className="mt-1" />
                    <label htmlFor="terms" className="text-sm text-slate-600">
                      I agree to the <Link href="#" className="text-indigo-600 hover:underline">Terms of Service</Link> and{' '}
                      <Link href="#" className="text-indigo-600 hover:underline">Privacy Policy</Link>. I also agree to receive
                      product updates and marketing communications.
                    </label>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !formData.adminName || !formData.adminEmail || !formData.adminPassword}
                      className="bg-anturon-500 hover:bg-anturon-600"
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                      {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {/* Sign in link */}
            <div className="mt-8 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Free 14-day trial
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            No credit card required
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Cancel anytime
          </div>
        </div>
      </div>
    </div>
  );
}
