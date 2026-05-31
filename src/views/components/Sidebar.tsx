import React from 'react';
import {
  LayoutDashboard,
  Shield,
  FileText,
  Home,
  Wallet,
  Receipt,
  Users,
  CreditCard,
  Folder,
} from 'lucide-react';
import { HubMark } from './HubMark';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'insurance', label: 'Insurance', Icon: Shield },
  { id: 'legal', label: 'Legal', Icon: FileText },
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'finances', label: 'Finances', Icon: Wallet },
  { id: 'taxes', label: 'Taxes', Icon: Receipt },
  { id: 'family', label: 'Family', Icon: Users },
  { id: 'credit', label: 'Credit', Icon: CreditCard },
  { id: 'documents', label: 'Documents', Icon: Folder },
];

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[200px] flex-col bg-cmd-black border-r border-cmd-border">
      <div className="flex items-center gap-3 border-b border-cmd-border px-5 py-5">
        <HubMark size={22} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cmd-offwhite">COMMAND</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cmd-muted">Household OS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-1">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${
                  isActive
                    ? 'border-l-2 border-cmd-gold bg-cmd-gold/10 text-cmd-gold'
                    : 'text-cmd-muted hover:text-cmd-offwhite hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-cmd-border px-4 py-4">
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
            activeView === 'profile'
              ? 'border-l-2 border-cmd-gold bg-cmd-gold/10 text-cmd-gold'
              : 'text-cmd-muted hover:text-cmd-offwhite hover:bg-white/5'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cmd-gold/15 text-cmd-gold">
            AB
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-cmd-offwhite">Adam Bailey</div>
            <div className="truncate text-xs text-cmd-muted">Savage, MN</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
