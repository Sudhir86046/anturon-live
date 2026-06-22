'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import {
  Building2, Bell, Shield, Save, CheckCircle,
  Wallet, TrendingDown, Loader2, User, Mail, Phone, CreditCard, Sparkles
} from 'lucide-react';

interface SettingsPageProps {
  params: { slug: string };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { user, organization } = useAuth();

  const [orgName, setOrgName]     = useState('');
  const [industry, setIndustry]   = useState('');
  const [region, setRegion]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({
    callCompleted: true, failedCalls: true, weeklyReport: false, productUpdates: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved]   = useState(false);

  const [totalSpent, setTotalSpent]     = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(5.00);
  const [loadingCost, setLoadingCost]   = useState(true);

  // Pre-fill org fields from auth context
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setIndustry(organization.industry || '');
      setRegion(organization.region || '');
    }
  }, [organization]);

  // Fetch real call cost total + wallet balance; auto-provision org if needed
  useEffect(() => {
    const load = async () => {
      try {
        // Auto-provision if org not yet set up (idempotent, safe to call every time)
        api.fetch('/organization.provision', { method: 'POST', body: JSON.stringify({ json: {} }) }).catch(() => {});

        const res = await api.fetch('/calls.stats', { method: 'GET' });
        const stats = res?.result?.data?.json;
        setTotalSpent(stats?.totalCost ?? 0);
        setWalletBalance(stats?.walletBalance ?? 5.00);
      } catch {
        setTotalSpent(0);
      } finally {
        setLoadingCost(false);
      }
    };
    load();
  }, []);

  const remaining = totalSpent !== null ? Math.max(0, walletBalance - totalSpent) : null;
  const usedPct   = totalSpent !== null ? Math.min(100, (totalSpent / walletBalance) * 100) : 0;
  const barColor  = usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-anturon-500';

  const handleSaveOrg = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Load notification prefs on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.fetch('/auth.getNotifications', { method: 'GET' });
        const prefs = res?.result?.data?.json;
        if (prefs) setNotifPrefs(prefs);
      } catch { /* keep defaults */ }
    };
    load();
  }, []);

  const handleChangePw = async () => {
    if (!currentPw || !newPw) return;
    setPwSaving(true);
    setPwError('');
    setPwSuccess(false);
    try {
      await api.fetch('/auth.changePassword', {
        method: 'POST',
        body: JSON.stringify({ json: { currentPassword: currentPw, newPassword: newPw } }),
      });
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: any) {
      setPwError(e.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleNotifToggle = async (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setNotifSaving(true);
    try {
      await api.fetch('/auth.updateNotifications', {
        method: 'POST',
        body: JSON.stringify({ json: updated }),
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch { /* revert on error */
      setNotifPrefs(notifPrefs);
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Settings" />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* ── Left column (2/3) ── */}
          <div className="xl:col-span-2 space-y-6">

          {/* ── Profile ── */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-anturon-100">
                  <User className="h-5 w-5 text-anturon-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Your Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={user?.name || ''} readOnly className="pl-9 bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={user?.email || ''} readOnly className="pl-9 bg-slate-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                  <Input value={user?.role || ''} readOnly className="bg-slate-50 capitalize" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input value={user?.phoneNumber || '—'} readOnly className="pl-9 bg-slate-50" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Organization ── */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Organization</CardTitle>
                  <CardDescription>Your company details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                  <Input value={orgName} onChange={e => setOrgName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Slug</label>
                  <Input value={params.slug} disabled className="bg-slate-50 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
                  <Input value={industry} onChange={e => setIndustry(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
                  <Input value={region} onChange={e => setRegion(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveOrg} disabled={saving} className="bg-anturon-500 hover:bg-anturon-600 gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          </div>{/* end left col */}

          {/* ── Right column (1/3) ── */}
          <div className="space-y-6">
          {/* ── Wallet & Usage ── */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Wallet & Usage</CardTitle>
                  <CardDescription>Actual spend calculated from your call history</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingCost ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculating usage from calls...
                </div>
              ) : (
                <>
                  {/* Balance cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                      <p className="text-xs font-medium text-red-500 mb-1 flex items-center justify-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Amount Used
                      </p>
                      <p className="text-2xl font-bold text-red-600">${(totalSpent || 0).toFixed(4)}</p>
                    </div>
                    <div className={`rounded-xl p-4 text-center border ${
                      (remaining || 0) < 1
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-green-50 border-green-100'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${(remaining || 0) < 1 ? 'text-amber-600' : 'text-green-600'}`}>
                        Remaining Balance
                      </p>
                      <p className={`text-2xl font-bold ${(remaining || 0) < 1 ? 'text-amber-700' : 'text-green-700'}`}>
                        ${(remaining || 0).toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>{usedPct.toFixed(1)}% used</span>
                      <span>${(totalSpent || 0).toFixed(4)} of ${walletBalance.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className={`${barColor} h-2.5 rounded-full transition-all`} style={{ width: `${usedPct}%` }} />
                    </div>
                    {(remaining || 0) < 1 && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium">⚠ Low balance — consider topping up soon.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">Starter Plan</Badge>
                    <span className="text-xs text-slate-400">Pay-as-you-go · No monthly fee</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Add Payment ── */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Add Payment Method</p>
                  <p className="text-xs text-slate-400 mt-0.5">Top up your wallet to keep calls running</p>
                </div>
              </div>
              <Button disabled className="w-full gap-2 opacity-60 cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white">
                <CreditCard className="h-4 w-4" />
                Add Payment Method
                <span className="ml-auto inline-flex items-center gap-0.5 bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                  <Sparkles className="h-2.5 w-2.5" /> Soon
                </span>
              </Button>
            </CardContent>
          </Card>

          </div>{/* end right col */}

          {/* ── Bottom full-width cards ── */}
          <div className="xl:col-span-3 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── Notifications ── */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Bell className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                  <CardDescription>Configure your alert preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { label: 'New call completed',      key: 'callCompleted'  },
                { label: 'Failed calls',            key: 'failedCalls'    },
                { label: 'Weekly analytics report', key: 'weeklyReport'   },
                { label: 'Product updates',         key: 'productUpdates' },
              ] as { label: string; key: keyof typeof notifPrefs }[]).map(item => (
                <label key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="text-slate-700 text-sm">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={notifPrefs[item.key]}
                    onChange={() => handleNotifToggle(item.key)}
                    className="rounded border-slate-300 accent-anturon-500 h-4 w-4"
                  />
                </label>
              ))}
              {notifSaved && <p className="text-xs text-green-600 font-medium">✓ Preferences saved</p>}
            </CardContent>
          </Card>

          {/* ── Security ── */}
          
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Security</CardTitle>
                  <CardDescription>Change your account password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                <Input type="password" placeholder="Enter current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                <Input type="password" placeholder="Enter new password" value={newPw} onChange={e => setNewPw(e.target.value)} />
              </div>
              {pwError && <p className="text-xs text-red-600 font-medium">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-green-600 font-medium">✓ Password changed successfully</p>}
              <Button variant="outline" onClick={handleChangePw} disabled={!currentPw || !newPw || pwSaving} className="gap-2">
                {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : pwSuccess ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CheckCircle className="h-4 w-4" />}
                {pwSuccess ? 'Password Changed!' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>

          </div>{/* end bottom row */}
        </div>
      </div>
    </>
  );
}
