'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  Megaphone, PhoneOutgoing, Bot, ChevronDown, Check, Loader2,
  Sparkles, Upload, Database, CheckCircle2, AlertCircle, X, User, Phone
} from 'lucide-react';

interface CampaignsPageProps {
  params: { slug: string };
}

export default function CampaignsPage({ params }: CampaignsPageProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [selectedNumber, setSelectedNumber] = useState<any>(null);
  const [agentDropdown, setAgentDropdown] = useState(false);
  const [numberDropdown, setNumberDropdown] = useState(false);

  // Call state
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState<{ success: boolean; message: string } | null>(null);

  // Recent calls
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [agentsRes, numbersRes] = await Promise.all([
        api.fetch('/agents.list', { method: 'GET' }),
        api.fetch('/phoneNumbers.list', { method: 'GET' }),
      ]);
      const agts: any[] = agentsRes?.result?.data?.json || [];
      const nums: any[] = numbersRes?.result?.data?.json || [];
      setAgents(agts);
      // Only show numbers that allow outbound
      const outbound = nums.filter(n =>
        !n.allowedCallTypes || n.allowedCallTypes.includes('outbound')
      );
      setPhoneNumbers(outbound);
      if (outbound.length > 0) setSelectedNumber(outbound[0]);
    } catch {
      // keep empty
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCall = async () => {
    if (!customerPhone || !selectedAgent) return;
    setCalling(true);
    setCallResult(null);
    try {
      const result = await api.initiateCall({
        assistantId: selectedAgent.id,
        phoneNumber: customerPhone,
        customerName: customerName || undefined,
        phoneNumberId: selectedNumber?.id,
      });
      const callStatus = result?.status || 'queued';
      const shortId = result?.id ? ` · ID: ${result.id.slice(0, 8)}…` : '';
      setCallResult({ success: true, message: `Call ${callStatus} to ${customerPhone}${shortId}` });
      setRecentCalls(prev => [{
        name: customerName || 'Unknown',
        phone: customerPhone,
        agent: selectedAgent.name,
        time: new Date().toLocaleTimeString(),
        status: callStatus,
        id: result?.id,
      }, ...prev.slice(0, 9)]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (e: any) {
      setCallResult({ success: false, message: e.message || 'Failed to initiate call' });
    } finally {
      setCalling(false);
    }
  };

  const isFormValid = customerPhone.trim().length >= 6 && selectedAgent;

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Campaigns" />

      <div className="flex-1 overflow-auto p-6 space-y-8">

        {/* ── Single Outbound Call ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-anturon-100 flex items-center justify-center">
                <PhoneOutgoing className="h-4 w-4 text-anturon-600" />
              </div>
              Make an Outbound Call
            </CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">Enter contact details, select an agent and trigger a call instantly.</p>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingData ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading agents and numbers...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Customer Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Contact Name <span className="text-slate-400 normal-case">(optional)</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="e.g. John Smith"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Phone Number <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="e.g. +919876543210"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="pl-9 font-mono"
                      />
                    </div>
                  </div>

                  {/* Select Agent */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Voice Agent <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <button
                        onClick={() => { setAgentDropdown(o => !o); setNumberDropdown(false); }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-anturon-300 text-sm transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className={selectedAgent ? 'text-slate-800' : 'text-slate-400'}>
                            {selectedAgent ? selectedAgent.name : 'Select an agent'}
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>
                      {agentDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                          {agents.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400">No agents found</div>
                          ) : agents.map(a => (
                            <button key={a.id} onClick={() => { setSelectedAgent(a); setAgentDropdown(false); }}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 hover:bg-anturon-50 transition-colors">
                              <span className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-anturon-500" />
                                {a.name}
                              </span>
                              {selectedAgent?.id === a.id && <Check className="h-4 w-4 text-anturon-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caller Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Call From <span className="text-slate-400 normal-case">(optional)</span></label>
                    <div className="relative">
                      <button
                        onClick={() => { setNumberDropdown(o => !o); setAgentDropdown(false); }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-anturon-300 text-sm transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <PhoneOutgoing className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className={selectedNumber ? 'text-slate-800 font-mono' : 'text-slate-400'}>
                            {selectedNumber ? selectedNumber.number : 'Auto-select'}
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>
                      {numberDropdown && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                          <button onClick={() => { setSelectedNumber(null); setNumberDropdown(false); }}
                            className="w-full flex items-center px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-50">
                            Auto-select
                          </button>
                          <div className="border-t border-slate-100" />
                          {phoneNumbers.map(n => (
                            <button key={n.id} onClick={() => { setSelectedNumber(n); setNumberDropdown(false); }}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 hover:bg-anturon-50 font-mono transition-colors">
                              {n.number}
                              {selectedNumber?.id === n.id && <Check className="h-4 w-4 text-anturon-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Call result banner */}
                {callResult && (
                  <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                    callResult.success
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}>
                    {callResult.success
                      ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                      : <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span className="flex-1">{callResult.message}</span>
                    <button onClick={() => setCallResult(null)}><X className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
                  </div>
                )}

                <Button
                  onClick={handleCall}
                  disabled={!isFormValid || calling}
                  className="gap-2 bg-anturon-500 hover:bg-anturon-600 px-6"
                >
                  {calling
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Initiating Call...</>
                    : <><PhoneOutgoing className="h-4 w-4" /> Start Call</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent calls */}
        {recentCalls.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Recent Calls This Session</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentCalls.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-sm text-slate-800">{c.name}</td>
                      <td className="px-6 py-3 text-sm font-mono text-slate-600">{c.phone}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">{c.agent}</td>
                      <td className="px-6 py-3 text-sm text-slate-400">{c.time}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* ── Coming Soon features ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-slate-100" />
            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-500">
              <Sparkles className="h-3 w-3 text-amber-500" /> More features coming soon
            </div>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Upload,
                title: 'CSV Bulk Calling',
                desc: 'Upload a CSV file with contacts and run automated outbound campaigns at scale.',
                color: 'bg-purple-50 text-purple-600',
              },
              {
                icon: Database,
                title: 'CRM Integration',
                desc: 'Sync contacts from HubSpot, Salesforce, Zoho and trigger calls directly from your CRM.',
                color: 'bg-blue-50 text-blue-600',
              },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm opacity-60 relative overflow-hidden">
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold text-amber-600">
                      <Sparkles className="h-2.5 w-2.5" /> Soon
                    </span>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${f.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mb-1">{f.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Close dropdowns on outside click */}
      {(agentDropdown || numberDropdown) && (
        <div className="fixed inset-0 z-10" onClick={() => { setAgentDropdown(false); setNumberDropdown(false); }} />
      )}
    </>
  );
}
