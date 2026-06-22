'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  Phone,
  Clock,
  TrendingUp,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

// Module-level cache — survives navigation (cleared after 60s)
const _cache: { data?: { stats: any[]; recentCalls: any[]; liveCallCount: number; agentCount: number }; ts?: number } = {};
const CACHE_TTL = 60_000;

interface DashboardPageProps {
  params: {
    slug: string;
  };
}

// Default stats when no data
const defaultStats = [
  {
    name: 'Total Calls',
    value: '0',
    change: '0%',
    trend: 'up',
    icon: Phone,
    color: 'bg-blue-500',
  },
  {
    name: 'Active Agents',
    value: '0',
    change: '0',
    trend: 'up',
    icon: Bot,
    color: 'bg-indigo-500',
  },
  {
    name: 'Avg Duration',
    value: '0m 0s',
    change: '0%',
    trend: 'down',
    icon: Clock,
    color: 'bg-green-500',
  },
  {
    name: 'Success Rate',
    value: '0%',
    change: '0%',
    trend: 'up',
    icon: TrendingUp,
    color: 'bg-purple-500',
  },
];

export default function DashboardPage({ params }: DashboardPageProps) {
  // Seed state from cache immediately — no loading flash on return visits
  const initCache = () => _cache.data && _cache.ts && (Date.now() - _cache.ts < CACHE_TTL) ? _cache.data : null;

  const [stats, setStats] = useState(() => initCache()?.stats ?? defaultStats);
  const [recentCalls, setRecentCalls] = useState<any[]>(() => initCache()?.recentCalls ?? []);
  const [loading, setLoading] = useState(() => !initCache());
  const [error, setError] = useState('');
  const [liveCallCount, setLiveCallCount] = useState(() => initCache()?.liveCallCount ?? 0);
  const [agentCount, setAgentCount] = useState(() => initCache()?.agentCount ?? 0);

  // Stable ref so SSE handler always calls the latest version (no stale closure)
  const fetchRef = useRef<(force?: boolean) => Promise<void>>();

  const fetchDashboardData = useCallback(async (force = false) => {
    if (!force && _cache.data && _cache.ts && (Date.now() - _cache.ts < CACHE_TTL)) return;
    try {
      // Only show full spinner if there is nothing cached to show
      if (!_cache.data) setLoading(true);

      const [dashboardData, callsData, agentsData] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getCalls(),
        api.getAgents(),
      ]);

      // If ALL three failed (e.g. 401) — do NOT overwrite cache or state with zeros
      const anySuccess = [dashboardData, callsData, agentsData].some(r => r.status === 'fulfilled');
      if (!anySuccess) {
        setError('Failed to load data — check API connection');
        return;
      }

      const overview = dashboardData.status === 'fulfilled' ? dashboardData.value : null;
      const calls    = callsData.status    === 'fulfilled' ? callsData.value    : (_cache.data?.recentCalls ?? []);
      const agents   = agentsData.status   === 'fulfilled' ? agentsData.value   : [];

      const totalCalls = overview?.month?.calls ?? 0;
      const activeAgents = agents.length;
      const avgDurationSec = totalCalls > 0 && overview?.month?.minutes
        ? Math.round((overview.month.minutes * 60) / totalCalls)
        : 0;
      const avgMin = Math.floor(avgDurationSec / 60);
      const avgSec = avgDurationSec % 60;
      const completedCalls = (Array.isArray(calls) ? calls : []).filter((c: any) => c.status === 'ended').length;
      const callsArr = Array.isArray(calls) ? calls : [];
      const successRate = callsArr.length > 0 ? Math.round((completedCalls / callsArr.length) * 100) : 0;

      const newStats = [
        { name: 'Total Calls (Month)', value: String(totalCalls), change: `${overview?.week?.calls ?? 0} this week`, trend: 'up', icon: Phone, color: 'bg-blue-500' },
        { name: 'Active Agents', value: String(activeAgents), change: `${agents.length} total`, trend: 'up', icon: Bot, color: 'bg-indigo-500' },
        { name: 'Avg Duration', value: `${avgMin}m ${avgSec}s`, change: `${overview?.month?.minutes ?? 0} mins total`, trend: 'up', icon: Clock, color: 'bg-green-500' },
        { name: 'Success Rate', value: `${successRate}%`, change: `${completedCalls} completed`, trend: 'up', icon: TrendingUp, color: 'bg-purple-500' },
      ];
      const newRecentCalls = callsArr.slice(0, 5);
      const newLiveCount   = callsArr.filter((c: any) => c.status === 'in-progress').length;
      const newAgentCount  = agents.length;

      setStats(newStats);
      setRecentCalls(newRecentCalls);
      setLiveCallCount(newLiveCount);
      setAgentCount(newAgentCount);
      setError('');

      // Only write to cache when we have real data (at least one call or one agent)
      if (totalCalls > 0 || activeAgents > 0 || callsArr.length > 0) {
        _cache.data = { stats: newStats, recentCalls: newRecentCalls, liveCallCount: newLiveCount, agentCount: newAgentCount };
        _cache.ts = Date.now();
      }
    } catch (err: any) {
      // Don't clear existing displayed data on error
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep ref in sync so SSE closure always calls the latest fetch
  fetchRef.current = fetchDashboardData;

  useEffect(() => {
    fetchDashboardData();

    const sse = new EventSource('http://localhost:3001/vapi/events');
    sse.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'call-started') setLiveCallCount(n => n + 1);
        if (event.type === 'call-ended' || event.type === 'end-of-call-report') {
          setLiveCallCount(n => Math.max(0, n - 1));
          _cache.ts = 0;
          fetchRef.current?.(true);
        }
      } catch { /* ignore malformed SSE */ }
    };
    sse.onerror = () => sse.close();
    return () => sse.close();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <>
        <DashboardHeader 
          organizationSlug={params.slug} 
          title="Dashboard"
          showCreateAgent
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-anturon-500 border-t-transparent"></div>
            <p className="text-sm text-slate-500">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader 
        organizationSlug={params.slug} 
        title="Dashboard"
        showCreateAgent
      />
      
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex-1 overflow-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
            
            return (
              <Card key={stat.name} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                      <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendIcon className="h-4 w-4" />
                      {stat.change}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-slate-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Calls */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Calls</CardTitle>
              <button 
                onClick={() => window.location.href = `/${params.slug}/calls`}
                className="text-sm text-anturon-600 hover:text-anturon-700 font-medium"
              >
                View all
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCalls.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No calls yet. Create an agent to get started.
                  </div>
                ) : recentCalls.map((call) => (
                  <div 
                    key={call.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        call.status === 'ended' ? 'bg-green-100 text-green-600' :
                        call.status === 'in-progress' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{call.customer?.number || call.customer?.name || 'Unknown'}</p>
                        <p className="text-sm text-slate-500">{call.assistant?.name || call.assistantId || 'Unknown Agent'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">
                        {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '—'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          call.status === 'ended' ? 'bg-green-100 text-green-700' :
                          call.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {call.endedReason ? call.endedReason.replace(/-/g, ' ') : call.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {call.startedAt ? new Date(call.startedAt).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity & Quick Actions */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Live Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${liveCallCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-sm text-slate-600">{liveCallCount} active call{liveCallCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-anturon-500" />
                    <span className="text-sm text-slate-600">{agentCount} agent{agentCount !== 1 ? 's' : ''} configured</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-anturon-500 to-anturon-600 text-white">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Upgrade to Growth</h3>
                <p className="text-sm text-orange-100 mb-4">
                  Get 5,000 minutes, priority support, and CRM integrations.
                </p>
                <button 
                  onClick={() => window.location.href = `/${params.slug}/settings?tab=billing`}
                  className="w-full py-2 px-4 bg-white text-anturon-500 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                >
                  View Plans
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
