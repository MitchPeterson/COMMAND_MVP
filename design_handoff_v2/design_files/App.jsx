// App.jsx — Command App root

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "startScreen": "dashboard"
}/*EDITMODE-END*/;

function EmptySection({ title, icon }) {
  return React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 14 } },
    React.createElement(Icon, { name: icon, size: 40, color: '#2A2B2E' }),
    React.createElement('div', null,
      React.createElement('h2', { style: { fontSize: 18, fontWeight: 600, color: '#3A3B3E', textAlign: 'center', marginBottom: 6 } }, title),
      React.createElement('p', { style: { fontSize: 13, color: '#2A2B2E', textAlign: 'center' } }, 'No data yet — connect your accounts to get started.')
    )
  );
}

function WelcomeBanner({ onDismiss }) {
  return React.createElement('div', {
    style: { background: 'rgba(201,162,77,0.08)', border: '1px solid rgba(201,162,77,0.2)', borderRadius: 10, padding: '12px 16px', margin: '0 32px 20px', display: 'flex', alignItems: 'center', gap: 12 }
  },
    React.createElement(Icon, { name: 'Zap', size: 15, color: C.gold }),
    React.createElement('p', { style: { fontSize: 13, color: C.offwhite, flex: 1, lineHeight: 1.5 } },
      React.createElement('strong', { style: { color: C.gold } }, 'Weekly Brief ready. '),
      '3 things need your attention this week — auto renewal, umbrella coverage gap, and $2,655 in recoverable savings.'
    ),
    React.createElement('button', {
      onClick: onDismiss,
      style: { fontSize: 12, fontWeight: 600, color: C.gold, background: 'none', border: `1px solid rgba(201,162,77,0.3)`, borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontFamily: 'IBM Plex Sans, -apple-system, sans-serif', whiteSpace: 'nowrap' }
    }, 'View Brief'),
    React.createElement('button', {
      onClick: onDismiss,
      style: { background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }
    }, React.createElement(Icon, { name: 'X', size: 14, color: C.muted }))
  );
}

function CommandApp() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('cmd_view') || '""') || TWEAK_DEFAULTS.startScreen; } catch { return TWEAK_DEFAULTS.startScreen; } })();
  const [view, setView] = React.useState(saved);
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = React.useState(false);

  const navigate = (v) => {
    setView(v);
    try { localStorage.setItem('cmd_view', JSON.stringify(v)); } catch {}
  };

  // Tweaks panel
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const renderMain = () => {
    switch (view) {
      case 'dashboard': return React.createElement(DashboardView, { onNav: navigate });
      case 'insurance': return React.createElement(InsuranceView, null);
      case 'legal': return React.createElement(LegalView, null);
      case 'home': return React.createElement(HomeView, null);
      case 'finances': return React.createElement(FinancesView, null);
      case 'taxes': return React.createElement(TaxesView, null);
      case 'family': return React.createElement(FamilyView, null);
      case 'credit': return React.createElement(CreditView, null);
      case 'documents': return React.createElement(DocumentsView, null);
      case 'profile': return React.createElement(EmptySection, { title: 'Profile', icon: 'User' });
      default: return React.createElement(DashboardView, { onNav: navigate });
    }
  };

  return React.createElement('div', { style: { display: 'flex', height: '100vh', overflow: 'hidden' } },
    React.createElement(Sidebar, { active: view, onNav: navigate }),
    React.createElement('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
      React.createElement('div', { style: { flex: 1, overflow: 'hidden' } }, renderMain())
    ),

    // Tweaks panel
    tweaksVisible && React.createElement('div', {
      style: { position: 'fixed', bottom: 20, right: 20, background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, width: 240, zIndex: 1000, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }
    },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Tweaks'),
      React.createElement('div', { style: { marginBottom: 12 } },
        React.createElement('div', { style: { fontSize: 12, color: C.muted, marginBottom: 6 } }, 'Start screen'),
        ['dashboard', 'insurance', 'legal'].map(s =>
          React.createElement('button', {
            key: s,
            onClick: () => { navigate(s); window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { startScreen: s } }, '*'); },
            style: { display: 'block', width: '100%', padding: '7px 10px', background: view === s ? 'rgba(201,162,77,0.1)' : 'transparent', border: `1px solid ${view === s ? 'rgba(201,162,77,0.3)' : C.border}`, borderRadius: 8, color: view === s ? C.gold : C.muted, fontSize: 12, fontWeight: view === s ? 600 : 400, cursor: 'pointer', marginBottom: 4, fontFamily: 'IBM Plex Sans, -apple-system, sans-serif', textAlign: 'left', textTransform: 'capitalize' }
          }, s.charAt(0).toUpperCase() + s.slice(1))
        )
      ),

    )
  );
}

function Root() {
  const [authed, setAuthed] = React.useState(() => {
    try { return !!localStorage.getItem('cmd_authed'); } catch { return false; }
  });
  const login = () => { try { localStorage.setItem('cmd_authed', '1'); } catch {} setAuthed(true); };

  return authed ? React.createElement(CommandApp) : React.createElement(AuthScreen, { onLogin: login });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Root));
