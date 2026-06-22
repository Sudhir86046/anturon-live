'use client';

import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { Users, UserPlus, Shield, CheckCircle, Sparkles, Crown } from 'lucide-react';

interface TeamPageProps {
  params: { slug: string };
}

export default function TeamPage({ params }: TeamPageProps) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const roleLabel =
    user?.role === 'super_admin' ? 'Super Admin'
    : user?.role === 'admin'     ? 'Admin'
    : user?.role === 'agent'     ? 'Agent'
    : 'Viewer';

  const roleColor = user?.role?.includes('admin')
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Team" />

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-100">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Members</p>
                <p className="text-2xl font-bold text-slate-900">1</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold text-slate-900">1</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Admins</p>
                <p className="text-2xl font-bold text-slate-900">1</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
              <CardDescription>Members in your organization</CardDescription>
            </div>
            <div className="relative">
              <Button disabled className="gap-2 opacity-60 cursor-not-allowed">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
              <span className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 bg-amber-100 border border-amber-200 text-amber-600 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                <Sparkles className="h-2.5 w-2.5" /> Soon
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-anturon-400 to-anturon-600 flex items-center justify-center text-white font-semibold text-sm">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={roleColor}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleLabel}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">You</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Invite Members — Coming Soon */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-anturon-50 border-2 border-dashed border-anturon-200 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5 text-anturon-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-700">Invite Team Members</p>
                  <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold text-amber-600">
                    <Sparkles className="h-3 w-3" /> Coming Soon
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Invite agents, viewers and admins to your organization. Set roles and manage permissions — coming in the next update.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
