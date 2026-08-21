import React from 'react';
import { CreditCard, FileDown, FileText, Folder, Home, LayoutDashboard, PieChart, Receipt, Shield, Users, Wallet } from 'lucide-react';
import { HubMark } from './HubMark';

// Exported so the header's search matches the same sections the sidebar shows.
// Two lists would drift, and a search that cannot find a section the nav has is
// worse than no search.
export const navItems = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'insurance', label: 'Insurance', Icon: Shield },
  { id: 'legal', label: 'Legal', Icon: FileText },
  { id: 'credit', label: 'Credit Cards', Icon: CreditCard },
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'finances', label: 'Finances', Icon: Wallet },
  { id: 'taxes', label: 'Taxes', Icon: Receipt },
  { id: 'family', label: 'Family', Icon: Users },
  { id: 'documents', label: 'Documents', Icon: Folder },
  { id: 'reports', label: 'Reports', Icon: FileDown },
];

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userName?: string;
  userLocation?: string;
  /** Drawer state below lg. Ignored at desktop widths, where it is always shown. */
  open?: boolean;
  onClose?: () => void;
}

/**
 * A fixed 200px rail is 53% of a 375px phone, which left content 175px wide and
 * every section unusable. Below lg it becomes a drawer over the content; from lg
 * up it is the rail it always was, unchanged.
 */
export function Sidebar({
  activeView, onNavigate, userName, userLocation, open = false, onClose,
}: SidebarProps) {
  // Navigating from the drawer should also close it — staying open over the view
  // you just asked for is the classic mobile drawer bug.
  const go = (view: string) => { onNavigate(view); onClose?.(); };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`z-50 flex h-screen w-[200px] shrink-0 flex-col border-r border-cmd-border bg-cmd-black transition-transform duration-200 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 lg:translate-x-0 ${
          open ? 'translate-x-0' : 'max-lg:-translate-x-full'
        }`}
      >
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
                onClick={() => go(id)}
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
          onClick={() => go('profile')}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
            activeView === 'profile'
              ? 'border-l-2 border-cmd-gold bg-cmd-gold/10 text-cmd-gold'
              : 'text-cmd-muted hover:text-cmd-offwhite hover:bg-white/5'
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cmd-gold/15 text-cmd-gold">
            {userName ? userName.slice(0, 2).toUpperCase() : 'AC'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-cmd-offwhite">{userName ?? 'Your account'}</div>
            <div className="truncate text-xs text-cmd-muted">{userLocation ?? 'Household'}</div>
          </div>
        </button>
      </div>
      </aside>
    </>
  );
}
