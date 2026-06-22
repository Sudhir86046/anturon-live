'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  Hash, RefreshCw, Bot, ChevronDown, Check, PhoneIncoming,
  PhoneOutgoing, Phone, AlertCircle, Save, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhoneNumbersPageProps {
  params: { slug: string };
}

const CALL_TYPES = [
  { value: 'inbound',  label: 'Inbound',  icon: PhoneIncoming,  color: 'bg-blue-100 text-blue-700' },
  { value: 'outbound', label: 'Outbound', icon: PhoneOutgoing, color: 'bg-purple-100 text-purple-700' },
];

function ProviderBadge({ provider }: { provider: string }) {
  const labels: Record<string, string> = {
    twilio:    'Twilio',
    vonage:    'Vonage',
    telnyx:    'Telnyx',
    vapi:      'Cloud Number',
    'byo-phone-number': 'BYO Number',
  };
  const colors: Record<string, string> = {
    twilio:    'bg-red-100 text-red-700',
    vonage:    'bg-blue-100 text-blue-700',
    telnyx:    'bg-green-100 text-green-700',
    vapi:      'bg-anturon-100 text-anturon-700',
    'byo-phone-number': 'bg-slate-100 text-slate-600',
  };
  const key = provider?.toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[key] || 'bg-slate-100 text-slate-600'}`}>
      {labels[key] || 'Number'}
    </span>
  );
}

export default function PhoneNumbersPage({ params }: PhoneNumbersPageProps) {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [localConfig, setLocalConfig] = useState<Record<string, { assistantId: string | null; allowedCallTypes: string[] }>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchData = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true); else setLoading(true);
      const [numsRes, agentsRes] = await Promise.all([
        api.fetch('/phoneNumbers.list', { method: 'GET' }),
        api.fetch('/agents.list', { method: 'GET' }),
      ]);
      const nums: any[] = numsRes?.result?.data?.json || [];
      const agts: any[] = agentsRes?.result?.data?.json || [];
      setNumbers(nums);
      setAgents(agts);
      // Initialise local config from VAPI data
      const init: Record<string, { assistantId: string | null; allowedCallTypes: string[] }> = {};
      nums.forEach(n => {
        init[n.id] = {
          assistantId: n.assistantId || null,
          allowedCallTypes: n.allowedCallTypes || ['inbound', 'outbound'],
        };
      });
      setLocalConfig(init);
      setDirty({});
    } catch (e) {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateConfig = (id: string, patch: Partial<{ assistantId: string | null; allowedCallTypes: string[] }>) => {
    setLocalConfig(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setDirty(prev => ({ ...prev, [id]: true }));
  };

  const toggleCallType = (id: string, type: string) => {
    const current = localConfig[id]?.allowedCallTypes || [];
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    if (next.length === 0) return; // must have at least one
    updateConfig(id, { allowedCallTypes: next });
  };

  const handleSave = async (num: any) => {
    const cfg = localConfig[num.id];
    if (!cfg) return;
    setSaving(prev => ({ ...prev, [num.id]: true }));
    try {
      await api.fetch('/phoneNumbers.update', {
        method: 'POST',
        body: JSON.stringify({
          json: {
            id: num.id,
            assistantId: cfg.assistantId,
            allowedCallTypes: cfg.allowedCallTypes,
          }
        }),
      });
      setDirty(prev => ({ ...prev, [num.id]: false }));
    } catch {
      // surface error if needed
    } finally {
      setSaving(prev => ({ ...prev, [num.id]: false }));
    }
  };

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Phone Numbers" />

      <div className="flex-1 overflow-auto p-6">

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Phone Numbers</h2>
            <p className="text-sm text-slate-500 mt-0.5">Synced automatically · Assign agents and configure call types</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-anturon-500 border-t-transparent" />
          </div>
        ) : numbers.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-20">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Hash className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-700">No phone numbers found</p>
              <p className="text-sm text-slate-400 text-center max-w-xs">
                No phone numbers are linked to your account yet. Contact support to get numbers added.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {numbers.map(num => {
              const cfg = localConfig[num.id] || { assistantId: null, allowedCallTypes: ['inbound', 'outbound'] };
              const attachedAgent = agents.find(a => a.id === cfg.assistantId);
              const isDirty = dirty[num.id];
              const isSaving = saving[num.id];

              return (
                <Card key={num.id} className={`border-0 shadow-sm transition-all ${isDirty ? 'ring-2 ring-anturon-300' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                      {/* Number info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-xl bg-anturon-50 flex items-center justify-center shrink-0">
                          <Phone className="h-5 w-5 text-anturon-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 font-mono">{num.number}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <ProviderBadge provider={num.provider} />
                            {num.name && <span className="text-xs text-slate-400">{num.name}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Call type toggles */}
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Allowed Calls</p>
                        <div className="flex gap-2">
                          {CALL_TYPES.map(ct => {
                            const Icon = ct.icon;
                            const active = cfg.allowedCallTypes.includes(ct.value);
                            return (
                              <button
                                key={ct.value}
                                onClick={() => toggleCallType(num.id, ct.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                                  active
                                    ? ct.color + ' border-current'
                                    : 'bg-white text-slate-300 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {ct.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Agent assignment */}
                      <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assigned Agent</p>
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === num.id ? null : num.id)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-anturon-300 text-sm transition-colors"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <Bot className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="truncate text-slate-700">
                                {attachedAgent ? attachedAgent.name : <span className="text-slate-400">No agent</span>}
                              </span>
                            </span>
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          </button>

                          {openDropdown === num.id && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                              <button
                                onClick={() => { updateConfig(num.id, { assistantId: null }); setOpenDropdown(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                              >
                                <span className="h-4 w-4" />
                                No agent (unassign)
                              </button>
                              <div className="border-t border-slate-100" />
                              {agents.length === 0 ? (
                                <div className="px-3 py-3 text-xs text-slate-400 flex items-center gap-2">
                                  <AlertCircle className="h-3.5 w-3.5" /> No agents found
                                </div>
                              ) : (
                                agents.map(agent => (
                                  <button
                                    key={agent.id}
                                    onClick={() => { updateConfig(num.id, { assistantId: agent.id }); setOpenDropdown(null); }}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-anturon-50 transition-colors"
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <Bot className="h-4 w-4 text-anturon-500 shrink-0" />
                                      <span className="truncate">{agent.name}</span>
                                    </span>
                                    {cfg.assistantId === agent.id && <Check className="h-4 w-4 text-anturon-600 shrink-0" />}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Save button */}
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={() => handleSave(num)}
                          disabled={!isDirty || isSaving}
                          className={`gap-2 ${isDirty ? 'bg-anturon-500 hover:bg-anturon-600' : ''}`}
                          variant={isDirty ? 'default' : 'outline'}
                        >
                          {isSaving ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                          ) : isDirty ? (
                            <><Save className="h-4 w-4" /> Save</>
                          ) : (
                            <><Check className="h-4 w-4" /> Saved</>
                          )}
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info callout */}
        {numbers.length > 0 && (
          <div className="mt-6 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
            <span>Agent assignments are synced automatically when you save. Call type settings are stored in Anturon. Changes take effect immediately.</span>
          </div>
        )}

      </div>

      {/* Close dropdown on outside click */}
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}
    </>
  );
}
