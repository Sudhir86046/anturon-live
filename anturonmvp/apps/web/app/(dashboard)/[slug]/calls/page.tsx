'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Phone, Clock, Search, Download, Play, FileText, RefreshCw, ArrowUpDown, Sparkles
} from 'lucide-react';
import { CallDetailPanel } from '@/components/calls/call-detail-panel';

interface CallsPageProps {
  params: { slug: string };
}

const statusColors: Record<string, string> = {
  ended: 'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  queued: 'bg-gray-100 text-gray-700',
  ringing: 'bg-yellow-100 text-yellow-700',
};

function formatDuration(secs?: number) {
  if (!secs) return '—';
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function CallsPage({ params }: CallsPageProps) {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCalls, setActiveCalls] = useState<Set<string>>(new Set());
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const fetchRef = useRef<() => Promise<void>>();

  const fetchCalls = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(prev => calls.length === 0 ? true : prev);
      const data = await api.getCalls();
      if (Array.isArray(data)) setCalls(data);
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calls.length]);

  fetchRef.current = fetchCalls;

  useEffect(() => {
    (fetchRef.current as any)?.(false);

    const sse = new EventSource('http://localhost:3001/vapi/events');
    sse.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'call-started') {
          setActiveCalls(prev => new Set([...prev, event.payload?.call?.id]));
          fetchRef.current?.();
        }
        if (event.type === 'call-ended' || event.type === 'end-of-call-report') {
          setActiveCalls(prev => { const n = new Set(prev); n.delete(event.payload?.call?.id); return n; });
          fetchRef.current?.();
        }
      } catch { /* ignore malformed SSE */ }
    };
    sse.onerror = () => sse.close();
    return () => sse.close();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return calls;
    const q = search.toLowerCase();
    return calls.filter(c =>
      c.customer?.number?.toLowerCase().includes(q) ||
      c.customer?.name?.toLowerCase().includes(q) ||
      c.assistant?.name?.toLowerCase().includes(q) ||
      c.id?.toLowerCase().includes(q)
    );
  }, [calls, search]);

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Call History" />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by phone, name, or agent..."
                  className="pl-10"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (fetchRef.current as any)?.(true)}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-anturon-200 text-anturon-700 hover:bg-anturon-50"
                onClick={() => {
                  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
                  const csv = ['Call ID,Customer,Phone,Agent,Status,Duration,Cost,Started,Transcript'].concat(
                    calls.map(c => [
                      c.anturonCallId || '',
                      c.type === 'webCall' ? 'Web Call' : (c.customer?.name || ''),
                      c.customerDisplay?.masked || c.customer?.number || '',
                      c.assistant?.name || '',
                      c.status,
                      formatDuration(c.duration),
                      c.cost ? `$${c.cost.toFixed(3)}` : '',
                      c.startedAt || '',
                      escape(c.transcript || ''),
                    ].join(','))
                  ).join('\n');
                  const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
                  a.download = 'calls.csv'; a.click();
                }}
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calls Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-anturon-500 border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Call ID</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">
                        <div className="flex items-center gap-2">Customer <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Agent</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">End Reason</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Duration</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Cost</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Started</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400 text-sm">
                          {search ? 'No calls match your search' : 'No calls yet from VAPI'}
                        </td>
                      </tr>
                    ) : filtered.map((call) => {
                      const isLive = activeCalls.has(call.id) || call.status === 'in-progress';
                      const customerDisplay = call.customerDisplay?.masked ||
                        (call.type === 'webCall' ? 'Web Call' : (call.customer?.number ? call.customer.number : 'Unknown'));
                      const isWebCall = call.type === 'webCall';
                      return (
                        <tr key={call.id} className={`hover:bg-slate-50 ${isLive ? 'bg-green-50' : ''}`}>
                          <td className="px-6 py-4">
                            {call.anturonCallId ? (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-mono font-medium text-slate-700">
                                {call.anturonCallId}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isLive && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                              <div>
                                {isWebCall ? (
                                  <p className="font-medium text-slate-900 flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 text-anturon-500" />
                                    Web Call
                                  </p>
                                ) : (
                                  <p className="font-medium text-slate-900">{call.customer?.name || '—'}</p>
                                )}
                                <p className="text-sm text-slate-500 font-mono">{isWebCall ? '' : customerDisplay}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {call.type === 'webCall' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />Web
                              </span>
                            )}
                            {call.type === 'inboundPhoneCall' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Inbound
                              </span>
                            )}
                            {call.type === 'outboundPhoneCall' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Outbound
                              </span>
                            )}
                            {!call.type && <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {call.assistant?.name || call.assistantId || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={statusColors[call.status] || 'bg-gray-100 text-gray-700'}>
                              {call.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {call.endedReason?.replace(/-/g, ' ') || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                              <Clock className="h-4 w-4" />
                              {formatDuration(call.duration)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {call.cost ? `$${call.cost.toFixed(3)}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {formatTime(call.startedAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {call.recordingUrl && (
                                <a href={call.recordingUrl} target="_blank" rel="noreferrer"
                                  className="p-2 hover:bg-slate-200 rounded-lg" title="Play recording">
                                  <Play className="h-4 w-4 text-anturon-600" />
                                </a>
                              )}
                              {(call.transcript || call.status === 'ended') && (
                                <button
                                  className="p-2 hover:bg-anturon-50 rounded-lg group"
                                  title="AI Analysis"
                                  onClick={() => setSelectedCall(call)}
                                >
                                  <Sparkles className="h-4 w-4 text-slate-400 group-hover:text-anturon-600 transition-colors" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-slate-500">
                {filtered.length} of {calls.length} calls
                {activeCalls.size > 0 && (
                  <span className="ml-2 text-green-600 font-medium">· {activeCalls.size} live</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {selectedCall && (
        <CallDetailPanel
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </>
  );
}
