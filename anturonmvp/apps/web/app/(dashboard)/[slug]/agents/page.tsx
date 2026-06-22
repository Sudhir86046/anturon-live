'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { 
  Bot, Phone, Clock, MoreVertical, Power, Edit, Play, Trash2, RefreshCw, FlaskConical
} from 'lucide-react';
import Link from 'next/link';
import { TestAgentModal } from '@/components/agents/test-agent-modal';

interface AgentsPageProps {
  params: { slug: string };
}

export default function AgentsPage({ params }: AgentsPageProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [callStats, setCallStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCallAgents, setActiveCallAgents] = useState<Set<string>>(new Set());
  const [testingAgent, setTestingAgent] = useState<{ id: string; name: string } | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const [agentsData, statsData] = await Promise.allSettled([
        api.getAgents(),
        api.fetch('/calls.stats', { method: 'GET' }).then(r => r.result?.data?.json).catch(() => null),
      ]);
      if (agentsData.status === 'fulfilled') setAgents(agentsData.value);
      if (statsData.status === 'fulfilled') setCallStats(statsData.value);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agent from VAPI? This cannot be undone.')) return;
    try {
      await api.fetch(`/agents.delete`, { method: 'POST', body: JSON.stringify({ json: { id } }) });
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // SSE real-time events
  useEffect(() => {
    fetchAgents();

    const sse = new EventSource('http://localhost:3001/vapi/events');
    sse.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === 'call-started') {
        setActiveCallAgents(prev => new Set([...prev, event.payload?.call?.assistantId]));
      }
      if (event.type === 'call-ended' || event.type === 'end-of-call-report') {
        setActiveCallAgents(prev => {
          const next = new Set(prev);
          next.delete(event.payload?.call?.assistantId);
          return next;
        });
        fetchAgents();
      }
    };
    return () => sse.close();
  }, []);

  if (loading) {
    return (
      <>
        <DashboardHeader organizationSlug={params.slug} title="Voice Agents" showCreateAgent />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-anturon-500 border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Voice Agents" showCreateAgent />

      <div className="flex-1 overflow-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-anturon-100">
                  <Bot className="h-6 w-6 text-anturon-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Agents</p>
                  <p className="text-2xl font-bold text-slate-900">{agents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <Power className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Live Calls</p>
                  <p className="text-2xl font-bold text-slate-900">{activeCallAgents.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-anturon-100">
                  <Phone className="h-6 w-6 text-anturon-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Calls</p>
                  <p className="text-2xl font-bold text-slate-900">{callStats?.totalCalls ?? '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-slate-100">
                  <Clock className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {callStats?.avgDuration
                      ? `${Math.floor(callStats.avgDuration / 60)}m ${callStats.avgDuration % 60}s`
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{agents.length} agents from VAPI</p>
          <Button variant="outline" size="sm" onClick={fetchAgents} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Bot className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">No agents found in your VAPI account</p>
              <p className="text-sm text-slate-400">Create your first agent to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const isLive = activeCallAgents.has(agent.id);
              return (
                <Card key={agent.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center relative ${isLive ? 'bg-green-100' : 'bg-anturon-100'}`}>
                          <Bot className={`h-6 w-6 ${isLive ? 'text-green-600' : 'text-anturon-600'}`} />
                          {isLive && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-pulse border-2 border-white" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base text-slate-900">{agent.name}</CardTitle>
                          <CardDescription className="text-xs text-slate-500">
                            {agent.model?.provider} / {agent.model?.model}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={isLive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                        {isLive ? '🔴 Live' : 'Ready'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {agent.firstMessage && (
                      <p className="text-sm text-slate-600 italic line-clamp-2">"{agent.firstMessage}"</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <div>
                        <span className="block font-medium text-slate-700">Voice</span>
                        {agent.voice?.voiceId || '—'}
                      </div>
                      <div>
                        <span className="block font-medium text-slate-700">Max Duration</span>
                        {agent.maxDurationSeconds ? `${Math.floor(agent.maxDurationSeconds / 60)}m` : '—'}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2 border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => setTestingAgent({ id: agent.id, name: agent.name })}
                      >
                        <FlaskConical className="h-4 w-4" />
                        Test
                      </Button>
                      <Link href={`/${params.slug}/agents/${agent.id}/edit`} className="flex-1">
                        <Button variant="outline" className="w-full gap-2 border-anturon-200 text-anturon-700 hover:bg-anturon-50">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-red-200 text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(agent.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {testingAgent && (
        <TestAgentModal
          agentId={testingAgent.id}
          agentName={testingAgent.name}
          onClose={() => setTestingAgent(null)}
        />
      )}
    </>
  );
}
