'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { TrendingUp, Phone, Clock, RefreshCw, Bot } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

interface AnalyticsPageProps {
  params: { slug: string };
}

function formatMins(mins: number) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const [data, setData] = useState<any>(null);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Only show spinner when there's nothing to show yet
      if (!data) setLoading(true);

      const [overview, series] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getTimeSeries(30),
      ]);

      // Don't replace existing data with empty results from a failed fetch
      if (overview.status === 'fulfilled' && overview.value) setData(overview.value);
      if (series.status === 'fulfilled' && Array.isArray(series.value)) setTimeSeries(series.value);
    } catch {
      // keep existing data visible
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <>
        <DashboardHeader organizationSlug={params.slug} title="Analytics" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-anturon-500 border-t-transparent" />
        </div>
      </>
    );
  }

  const month = data?.month;
  const week  = data?.week;
  const today = data?.today;
  const total = data?.total;
  const agents: any[] = data?.agentPerformance || [];
  const totalAgents  = agents.length;
  const totalEnded   = agents.reduce((s: number, a: any) => s + (a.ended || 0), 0);
  const overallRate  = total?.calls > 0 ? Math.round((totalEnded / total.calls) * 100) : 0;
  const avgMinsPerCall = total?.calls > 0 ? Math.round((total.minutes * 60) / total.calls) : 0;

  // Format date label to shorter form e.g. Apr 22
  const chartData = timeSeries.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <>
      <DashboardHeader organizationSlug={params.slug} title="Analytics" />

      <div className="flex-1 overflow-auto p-6">
        {/* Period summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Today',      calls: today?.calls ?? 0, minutes: today?.minutes ?? 0, color: 'bg-anturon-100 text-anturon-600' },
            { label: 'This Week',  calls: week?.calls  ?? 0, minutes: week?.minutes  ?? 0, color: 'bg-blue-100 text-blue-600' },
            { label: 'This Month', calls: month?.calls ?? 0, minutes: month?.minutes ?? 0, color: 'bg-purple-100 text-purple-600' },
            { label: 'All Time',   calls: total?.calls ?? 0, minutes: total?.minutes ?? 0, color: 'bg-slate-100 text-slate-600' },
          ].map(period => (
            <Card key={period.label} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">{period.label}</p>
                <p className="text-3xl font-bold text-slate-900">{period.calls}</p>
                <p className="text-sm text-slate-500 mt-1">{formatMins(period.minutes)} total</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-anturon-100"><Phone className="h-6 w-6 text-anturon-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Total Calls</p>
                <p className="text-2xl font-bold text-slate-900">{total?.calls ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100"><Clock className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Avg Duration</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.floor(avgMinsPerCall / 60)}m {avgMinsPerCall % 60}s
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-900">{overallRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100"><Bot className="h-6 w-6 text-purple-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Active Agents</p>
                <p className="text-2xl font-bold text-slate-900">{totalAgents}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call volume line chart — last 30 days */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-anturon-600" />
              Call Volume — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(chartData.length / 6)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
                    formatter={(val: any) => [val, 'Calls']}
                    labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="url(#callGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#f97316', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agent performance table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5 text-anturon-600" />
              Agent Performance
            </CardTitle>
            <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-lg">
              <RefreshCw className="h-4 w-4 text-slate-500" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {agents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No call data yet. Make calls via VAPI to see agent performance.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Agent</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Calls</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Completed</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Success Rate</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Total Duration</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-600">Avg per Call</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...agents].sort((a, b) => b.calls - a.calls).map((agent) => {
                      const avgSec = agent.calls > 0 ? Math.round((agent.minutes * 60) / agent.calls) : 0;
                      return (
                        <tr key={agent.agentId} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-anturon-100 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-anturon-600" />
                              </div>
                              <p className="font-medium text-slate-900">{agent.agentName}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">{agent.calls}</td>
                          <td className="px-6 py-4 text-slate-600">{agent.ended ?? 0}</td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${agent.successRate >= 70 ? 'text-green-600' : agent.successRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                              {agent.successRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{formatMins(agent.minutes)}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {Math.floor(avgSec / 60)}m {avgSec % 60}s
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
