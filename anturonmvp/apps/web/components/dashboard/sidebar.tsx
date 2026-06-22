'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { 
  LayoutDashboard, 
  Bot, 
  Phone, 
  Settings, 
  Users, 
  BarChart3,
  LogOut,
  Hash,
  BookOpen,
  Megaphone,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  organizationSlug: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

const navigation = [
  { name: 'Dashboard',      href: '',               icon: LayoutDashboard },
  { name: 'Voice Agents',   href: '/agents',         icon: Bot },
  { name: 'Phone Numbers',  href: '/phone-numbers',   icon: Hash },
  { name: 'Knowledge Base', href: '/knowledge-base',  icon: BookOpen },
  { name: 'Campaigns',      href: '/campaigns',       icon: Megaphone },
  { name: 'Calls',          href: '/calls',           icon: Phone },
  { name: 'Analytics',      href: '/analytics',      icon: BarChart3 },
  { name: 'Team',           href: '/team',           icon: Users },
  { name: 'Settings',       href: '/settings',       icon: Settings },
];

export function DashboardSidebar({ organizationSlug, user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center p-4 border-b border-slate-800 bg-slate-900">
        {/* Logo SVG */}
        <svg viewBox="0 0 200 40" className="h-10 w-auto" aria-label="Anturon">
          {/* Icon - orange rounded square with lightning bolt */}
          <g transform="translate(0, 2)">
            {/* Rounded square background */}
            <rect x="0" y="0" width="36" height="36" rx="6" fill="#E85D04"/>
            {/* Lightning bolt */}
            <path d="M22 8 L12 20 H20 L18 28 L28 16 H20 L22 8 Z" fill="white"/>
          </g>
          {/* Wordmark - anturon */}
          <text x="44" y="28" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="600" fill="#E85D04">anturon</text>
        </svg>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const href = `/${organizationSlug}${item.href}`;
          const isActive = item.href === ''
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-anturon-500 text-white shadow-md shadow-anturon-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <UserSection user={user} organizationSlug={organizationSlug} />
    </div>
  );
}

const WALLET_BALANCE = 5.00;

function UserSection({ user, organizationSlug }: { user?: { name: string; email: string; role: string }; organizationSlug: string }) {
  const { logout } = useAuth();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const CACHE_KEY = 'anturon_wallet_remaining';
    const CACHE_TTL = 60_000; // 60 seconds

    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { value, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) {
        setRemaining(value);
        return;
      }
    }

    const load = async () => {
      try {
        const res = await api.fetch('/calls.stats', { method: 'GET' });
        const stats = res?.result?.data?.json;
        const balance = stats?.walletBalance ?? WALLET_BALANCE;
        const value = Math.max(0, balance - (stats?.totalCost ?? 0));
        setRemaining(value);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ value, ts: Date.now() }));
      } catch {
        setRemaining(WALLET_BALANCE);
      }
    };
    load();
  }, []);

  const pct = remaining !== null ? Math.min(100, (remaining / WALLET_BALANCE) * 100) : 100;
  const isLow = remaining !== null && remaining < 1;

  return (
    <div className="border-t border-slate-800 p-4">
      {/* Wallet badge */}
      <Link href={`/${organizationSlug}/settings`} className={`mb-3 flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
        isLow ? 'bg-red-900/40 border border-red-700/50' : 'bg-slate-800 border border-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          <Wallet className={`h-3.5 w-3.5 ${isLow ? 'text-red-400' : 'text-anturon-400'}`} />
          <span className="text-xs text-slate-400">Wallet</span>
        </div>
        <div className="text-right">
          {remaining === null ? (
            <span className="text-xs text-slate-500">...</span>
          ) : (
            <span className={`text-xs font-bold ${
              isLow ? 'text-red-400' : 'text-anturon-400'
            }`}>${remaining.toFixed(2)}</span>
          )}
        </div>
      </Link>
      {/* mini bar */}
      <div className="mb-3 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all ${
            isLow ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-anturon-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {user && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-anturon-400 to-anturon-600 flex items-center justify-center text-sm font-semibold text-white">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      )}
      <button 
        onClick={logout}
        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
