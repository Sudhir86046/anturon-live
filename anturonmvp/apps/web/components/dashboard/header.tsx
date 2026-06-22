'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Search, Plus, Phone, Bot, BarChart3, Settings, Users, Hash, BookOpen, Megaphone, X, CheckCheck, PhoneCall, AlertTriangle, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';

interface HeaderProps {
  organizationSlug: string;
  title: string;
  showCreateAgent?: boolean;
}

// ── Static page shortcuts ────────────────────────────────────────────────────
const NAV_PAGES = [
  { label: 'Dashboard',     path: '',               icon: BarChart3 },
  { label: 'Voice Agents',  path: '/agents',         icon: Bot       },
  { label: 'Phone Numbers', path: '/phone-numbers',  icon: Hash      },
  { label: 'Knowledge Base',path: '/knowledge-base', icon: BookOpen  },
  { label: 'Campaigns',     path: '/campaigns',      icon: Megaphone },
  { label: 'Calls',         path: '/calls',          icon: Phone     },
  { label: 'Analytics',     path: '/analytics',      icon: BarChart3 },
  { label: 'Team',          path: '/team',           icon: Users     },
  { label: 'Settings',      path: '/settings',       icon: Settings  },
];

// ── Notification type ────────────────────────────────────────────────────────
interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  agentName?: string | null;
  vapiCallId?: string | null;
  createdAt: string | Date;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function timeAgo(date: string | Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60)  return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function notifIcon(type: string) {
  if (type === 'call_completed') return <PhoneCall className="h-3.5 w-3.5 text-green-500" />;
  if (type === 'call_failed')    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  if (type === 'low_wallet')     return <Wallet className="h-3.5 w-3.5 text-amber-500" />;
  if (type === 'agent_error')    return <Zap className="h-3.5 w-3.5 text-orange-500" />;
  return <Bell className="h-3.5 w-3.5 text-slate-400" />;
}

export function DashboardHeader({ organizationSlug, title, showCreateAgent }: HeaderProps) {
  const router  = useRouter();
  const { organization } = useAuth();

  // ── Search ──────────────────────────────────────────────────────────────────
  const [query, setQuery]           = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [agents, setAgents]         = useState<any[]>([]);
  const [calls, setCalls]           = useState<any[]>([]);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadSearchData = async () => {
    if (searchLoaded) return;
    setSearchLoaded(true);
    try {
      const [ar, cr] = await Promise.all([
        api.fetch('/agents.list', { method: 'GET' }),
        api.fetch('/calls.list', { method: 'GET' }),
      ]);
      setAgents(ar?.result?.data?.json || []);
      setCalls((cr?.result?.data?.json?.calls || []).slice(0, 50));
    } catch { /* ignore */ }
  };

  const q = query.trim().toLowerCase();
  const matchedPages  = q ? NAV_PAGES.filter(p => p.label.toLowerCase().includes(q)) : [];
  const matchedAgents = q ? agents.filter((a: any) => a.name?.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchedCalls  = q ? calls.filter((c: any) =>
    c.customer?.name?.toLowerCase().includes(q) ||
    c.customer?.number?.includes(q) ||
    c.id?.toLowerCase().includes(q)
  ).slice(0, 4) : [];

  const hasResults = matchedPages.length + matchedAgents.length + matchedCalls.length > 0;

  const handleSelect = (href: string) => {
    setQuery('');
    setSearchOpen(false);
    router.push(href);
  };

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef  = useRef<HTMLDivElement>(null);
  const unread    = notifs.filter(n => !n.read).length;

  // Fetch from API
  const fetchNotifs = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await api.fetch('/notifications.list', { method: 'GET' });
      const list: Notif[] = res?.result?.data?.json || [];
      setNotifs(list);
    } catch { /* keep existing */ } finally {
      setNotifLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // SSE: push new notifications in real-time
  useEffect(() => {
    if (!organization?.id) return;
    const sse = new EventSource(`${API_BASE}/vapi/events?orgId=${organization.id}`);
    sse.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'notification' && event.notification) {
          setNotifs(prev => [event.notification as Notif, ...prev].slice(0, 50));
        }
      } catch { /* ignore */ }
    };
    sse.onerror = () => sse.close();
    return () => sse.close();
  }, [organization?.id]);

  const markAll = useCallback(async () => {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    try { await api.fetch('/notifications.markAllRead', { method: 'POST', body: JSON.stringify({ json: {} }) }); } catch { /* ignore */ }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.fetch('/notifications.markRead', { method: 'POST', body: JSON.stringify({ json: { id } }) }); } catch { /* ignore */ }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setNotifs(ns => ns.filter(n => n.id !== id));
    try { await api.fetch('/notifications.dismiss', { method: 'POST', body: JSON.stringify({ json: { id } }) }); } catch { /* ignore */ }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>

      <div className="flex-1" />

      <div className="flex items-center gap-3">

        {/* ── Search ── */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => { setSearchOpen(true); loadSearchData(); }}
            placeholder="Search pages, agents, calls…"
            className="w-64 pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-anturon-400 focus:bg-white transition-all"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}

          {/* Dropdown */}
          {searchOpen && query && (
            <div className="absolute top-full mt-1 left-0 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
              {!hasResults ? (
                <p className="px-4 py-3 text-sm text-slate-400">No results for "{query}"</p>
              ) : (
                <>
                  {matchedPages.length > 0 && (
                    <div>
                      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pages</p>
                      {matchedPages.map(p => {
                        const Icon = p.icon;
                        return (
                          <button key={p.path} onClick={() => handleSelect(`/${organizationSlug}${p.path}`)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-anturon-50 transition-colors">
                            <Icon className="h-4 w-4 text-anturon-500 shrink-0" />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {matchedAgents.length > 0 && (
                    <div>
                      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Voice Agents</p>
                      {matchedAgents.map((a: any) => (
                        <button key={a.id} onClick={() => handleSelect(`/${organizationSlug}/agents/${a.id}/edit`)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-anturon-50 transition-colors">
                          <Bot className="h-4 w-4 text-purple-500 shrink-0" />
                          {a.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {matchedCalls.length > 0 && (
                    <div>
                      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Calls</p>
                      {matchedCalls.map((c: any) => (
                        <button key={c.id} onClick={() => handleSelect(`/${organizationSlug}/calls`)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-anturon-50 transition-colors">
                          <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="truncate">{c.customer?.name || c.customer?.number || c.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Create Agent Button */}
        {showCreateAgent && (
          <Link href={`/${organizationSlug}/agents/new`}>
            <Button className="gap-2 bg-anturon-500 hover:bg-anturon-600 shadow-md shadow-anturon-500/20">
              <Plus className="h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        )}

        {/* ── Notifications ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-anturon-500 flex items-center justify-center text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
                <div className="flex items-center gap-3">
                  {unread > 0 && (
                    <button onClick={markAll} className="flex items-center gap-1 text-xs text-anturon-600 hover:text-anturon-700 font-medium">
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifLoading && notifs.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 rounded-full border-2 border-anturon-400 border-t-transparent animate-spin" />
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Bell className="h-7 w-7 text-slate-200" />
                    <p className="text-sm text-slate-400">All caught up!</p>
                    <p className="text-xs text-slate-300">Notifications will appear here after calls.</p>
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                      n.read ? '' : 'bg-anturon-50/40'
                    }`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${
                        n.read ? 'text-slate-500' : 'text-slate-800'
                      }`}>{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                      className="shrink-0 text-slate-300 hover:text-slate-500 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
                <Link href={`/${organizationSlug}/settings`} onClick={() => setNotifOpen(false)}
                  className="text-xs text-anturon-600 hover:text-anturon-700 font-medium">
                  Notification settings →
                </Link>
                {notifs.length > 0 && (
                  <span className="text-[10px] text-slate-400">{notifs.length} total</span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
