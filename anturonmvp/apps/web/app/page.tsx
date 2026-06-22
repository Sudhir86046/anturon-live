import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div>
            <svg viewBox="0 0 200 40" className="h-8 w-auto" aria-label="Anturon">
              <g transform="translate(0, 2)">
                <rect x="0" y="0" width="36" height="36" rx="6" fill="#E85D04"/>
                <path d="M22 8 L12 20 H20 L18 28 L28 16 H20 L22 8 Z" fill="white"/>
              </g>
              <text x="44" y="28" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="600" fill="#E85D04">anturon</text>
            </svg>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-enterprise-600">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-anturon-500 hover:bg-anturon-600 text-white shadow-lg shadow-anturon-500/25">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-anturon-50 via-white to-enterprise-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-anturon-100/50 to-transparent" />
        <div className="container relative py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6 bg-anturon-100 text-anturon-700 border-anturon-200 hover:bg-anturon-100">
              Now Available in UAE & India
            </Badge>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl text-enterprise-900">
              AI Voice Agents for{' '}
              <span className="bg-gradient-to-r from-anturon-500 to-anturon-600 bg-clip-text text-transparent">Modern Enterprise</span>
            </h1>
            <p className="mt-8 text-xl text-enterprise-600 leading-relaxed max-w-2xl mx-auto">
              Deploy intelligent voice assistants that handle customer support, qualify leads,
              and close sales—24/7. Built for the Middle East and Indian markets.
            </p>
            <div className="mt-12 flex justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-anturon-500 hover:bg-anturon-600 text-white shadow-xl shadow-anturon-500/30 px-8">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-24 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-enterprise-900 mb-4">Enterprise-Grade Solutions</h2>
          <p className="text-lg text-enterprise-600 max-w-2xl mx-auto">
            Purpose-built voice AI for every stage of your customer journey
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="border-0 shadow-xl shadow-enterprise-200/50 bg-white overflow-hidden group hover:shadow-2xl hover:shadow-anturon-200/30 transition-all duration-300">
            <div className="h-1 bg-gradient-to-r from-anturon-400 to-anturon-500" />
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl bg-anturon-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-7 w-7 text-anturon-600" />
              </div>
              <CardTitle className="text-xl text-enterprise-900">Customer Support</CardTitle>
              <CardDescription className="text-enterprise-600">
                24/7 automated support in Arabic, English, Hindi, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-enterprise-600">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Instant query resolution</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Multi-language support</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Smart escalation to agents</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-enterprise-200/50 bg-white overflow-hidden group hover:shadow-2xl hover:shadow-anturon-200/30 transition-all duration-300">
            <div className="h-1 bg-gradient-to-r from-anturon-400 to-anturon-500" />
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl bg-anturon-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-7 w-7 text-anturon-600" />
              </div>
              <CardTitle className="text-xl text-enterprise-900">Lead Qualification</CardTitle>
              <CardDescription className="text-enterprise-600">
                AI-powered calling to qualify and score potential customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-enterprise-600">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Automated outreach</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Intelligent scoring</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />CRM integration</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-enterprise-200/50 bg-white overflow-hidden group hover:shadow-2xl hover:shadow-anturon-200/30 transition-all duration-300">
            <div className="h-1 bg-gradient-to-r from-anturon-400 to-anturon-500" />
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl bg-anturon-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7 text-anturon-600" />
              </div>
              <CardTitle className="text-xl text-enterprise-900">Sales Automation</CardTitle>
              <CardDescription className="text-enterprise-600">
                Close deals faster with AI sales assistants that never sleep
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-enterprise-600">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Follow-up automation</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Product recommendations</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-anturon-500" />Payment collection</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Industries */}
      <section className="border-t bg-enterprise-50/50 py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-enterprise-900">Built for Your Industry</h2>
            <p className="mt-4 text-enterprise-600">
              Specialized templates for key sectors in Middle East and India
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[
              { name: 'Retail', icon: '🛍️' },
              { name: 'Real Estate', icon: '🏢' },
              { name: 'E-commerce', icon: '📦' },
              { name: 'Fintech', icon: '💳' },
              { name: 'Banking', icon: '🏦' },
            ].map((industry) => (
              <Card key={industry.name} className="text-center border-0 shadow-lg shadow-enterprise-100 hover:shadow-xl hover:shadow-anturon-100/50 transition-all duration-300 bg-white">
                <CardContent className="pt-6">
                  <div className="text-4xl mb-3">{industry.icon}</div>
                  <p className="font-semibold text-enterprise-900">{industry.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-enterprise-900 text-white py-6">
        <div className="container flex items-center justify-between">
          <svg viewBox="0 0 200 40" className="h-7 w-auto" aria-label="Anturon">
            <g transform="translate(0, 2)">
              <rect x="0" y="0" width="36" height="36" rx="6" fill="#E85D04"/>
              <path d="M22 8 L12 20 H20 L18 28 L28 16 H20 L22 8 Z" fill="white"/>
            </g>
            <text x="44" y="28" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="600" fill="white">anturon</text>
          </svg>
          <p className="text-sm text-enterprise-500">Enterprise-grade Voice AI Platform</p>
          <p className="text-sm text-enterprise-400">&copy; 2025. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
