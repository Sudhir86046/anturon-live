'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mic2, 
  Bot,
  CheckCircle,
  Globe,
  Briefcase,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Phone,
  Users,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingPageProps {
  params: {
    slug: string;
  };
}

const agentTypes = [
  {
    id: 'customer_support',
    name: 'Customer Support',
    description: 'Handle inquiries, complaints, and general support',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    id: 'lead_qualification',
    name: 'Lead Qualification',
    description: 'Qualify prospects and gather contact details',
    icon: Users,
    color: 'bg-green-500',
  },
  {
    id: 'sales',
    name: 'Sales Closer',
    description: 'Close deals and process payments',
    icon: Sparkles,
    color: 'bg-purple-500',
  },
  {
    id: 'appointment_booking',
    name: 'Appointment Booking',
    description: 'Schedule meetings and send reminders',
    icon: Calendar,
    color: 'bg-orange-500',
  },
];

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', flag: '🇦🇪' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

export default function OnboardingPage({ params }: OnboardingPageProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [useTemplate, setUseTemplate] = useState(true);

  const handleComplete = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    
    // Redirect to dashboard
    router.push(`/${params.slug}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Welcome to Anturon!</h1>
            <span className="text-sm text-slate-500">Step {step} of 2</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl font-bold">Create Your First AI Agent</CardTitle>
                <CardDescription className="text-slate-500 max-w-md mx-auto">
                  Choose what type of voice agent you want to create. You can always add more agents later.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedAgent(type.id)}
                        className={cn(
                          'p-6 rounded-xl border-2 text-left transition-all hover:shadow-md',
                          selectedAgent === type.id
                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                            : 'border-slate-200 hover:border-indigo-300'
                        )}
                      >
                        <div className={`w-12 h-12 ${type.color} rounded-xl flex items-center justify-center mb-4`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">{type.name}</h3>
                        <p className="text-sm text-slate-500">{type.description}</p>
                        {selectedAgent === type.id && (
                          <div className="mt-4 flex items-center gap-2 text-indigo-600 text-sm font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Selected
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-8">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedAgent}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold">Configure Language</CardTitle>
                <CardDescription className="text-slate-500 max-w-md mx-auto">
                  Select the primary language your AI agent will speak with customers.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Agent Language
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLanguage(lang.code)}
                        className={cn(
                          'p-4 rounded-xl border-2 text-center transition-all',
                          selectedLanguage === lang.code
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-slate-200 hover:border-indigo-300'
                        )}
                      >
                        <span className="text-3xl mb-2 block">{lang.flag}</span>
                        <span className="font-medium text-slate-900">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTemplate}
                      onChange={(e) => setUseTemplate(e.target.checked)}
                      className="mt-1 rounded border-slate-300"
                    />
                    <div>
                      <span className="font-medium text-slate-900">Use industry template</span>
                      <p className="text-sm text-slate-500">
                        Start with pre-configured prompts and settings for your industry
                      </p>
                    </div>
                  </label>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-indigo-900">What happens next?</h4>
                      <ul className="text-sm text-indigo-700 mt-2 space-y-1">
                        <li>• Your AI agent will be created instantly</li>
                        <li>• You can test it with a mock call</li>
                        <li>• Customize the personality and prompts</li>
                        <li>• Add phone number to go live</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isLoading ? 'Creating Agent...' : 'Create Agent'}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Help */}
        <div className="mt-8 text-center text-sm text-slate-500">
          Need help?{' '}
          <a href="#" className="text-indigo-600 hover:underline">
            Contact support
          </a>{' '}
          or{' '}
          <button 
            onClick={() => router.push(`/${params.slug}/dashboard`)}
            className="text-indigo-600 hover:underline"
          >
            skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
