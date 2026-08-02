// Auth.jsx v2 — Command authentication
// Split-screen layout: left brand panel (persistent) + right form panel.
// Modeled after private bank and institutional SaaS portals — not consumer fintech.
// Left panel never changes; only the right panel switches between choose/signin/signup.

const pillars = ['Insurance', 'Legal', 'Home', 'Finances', 'Taxes', 'Family', 'Credit', 'Documents'];

function AuthBrandPanel() {
  return React.createElement('div', {
    style: {
      width: '42%', minWidth: 320, height: '100vh',
      background: C.black,
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      padding: '52px 48px',
      position: 'relative', overflow: 'hidden',
    }
  },
    // Hub mark + wordmark
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 } },
      React.createElement(HubMark, { size: 28 }),
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', color: C.offwhite } }, 'COMMAND'),
        React.createElement('div', { style: { fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginTop: 2 } }, 'Household OS')
      )
    ),
    // Main statement
    React.createElement('div', { style: { flex: 1 } },
      React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gold, marginBottom: 16 } }, 'The Household Operating System'),
      React.createElement('h1', {
        style: { fontSize: 30, fontWeight: 700, color: C.offwhite, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 20 }
      }, 'Every obligation.\nEvery deadline.\nOne system.'),
      React.createElement('p', {
        style: { fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 40, maxWidth: 320 }
      }, 'Command monitors everything a household is financially accountable for — and tells you what to act on, before it becomes a problem.'),
      // Gold separator
      React.createElement('div', { style: { width: 32, height: 2, background: C.gold, marginBottom: 28 } }),
      // Pillar grid
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' } },
        pillars.map(p => React.createElement('div', {
          key: p,
          style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6A6A6F' }
        },
          React.createElement('div', { style: { width: 4, height: 4, borderRadius: '50%', background: C.border, flexShrink: 0 } }),
          p
        ))
      )
    ),
    // Bottom tagline
    React.createElement('div', { style: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3A3B3E' } },
      'COMMAND · Household Operating System'
    )
  );
}

function AuthFormPanel({ onLogin }) {
  const [mode, setMode] = React.useState('choose');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const reset = () => { setEmail(''); setPassword(''); setError(null); };

  const handleSubmit = () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };

  const inputStyle = {
    display: 'block', width: '100%',
    background: C.black, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: '12px 14px',
    color: C.offwhite, fontSize: 13,
    fontFamily: 'IBM Plex Sans, -apple-system, sans-serif',
    outline: 'none', transition: 'border-color 150ms',
  };

  const panelStyle = {
    flex: 1, height: '100vh', background: C.charcoal,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '52px 48px',
  };

  // Choose mode
  if (mode === 'choose') return React.createElement('div', { style: panelStyle },
    React.createElement('div', { style: { width: '100%', maxWidth: 360 } },
      React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 } }, 'Get started'),
      React.createElement('h2', { style: { fontSize: 24, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.015em', marginBottom: 8 } }, 'Your household, under control.'),
      React.createElement('p', { style: { fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 36 } },
        'Sign in to access your dashboard, or create an account to get started.'
      ),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        React.createElement('button', {
          onClick: () => { reset(); setMode('signup'); },
          style: { width: '100%', background: C.gold, color: C.black, fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 6, padding: '13px 20px', cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.01em' }
        }, 'Create an account'),
        React.createElement('button', {
          onClick: () => { reset(); setMode('signin'); },
          style: { width: '100%', background: 'transparent', color: C.offwhite, fontWeight: 600, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 6, padding: '13px 20px', cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
        }, 'Sign in')
      )
    )
  );

  const isSignUp = mode === 'signup';
  return React.createElement('div', { style: panelStyle },
    React.createElement('div', { style: { width: '100%', maxWidth: 360 } },
      React.createElement('button', {
        onClick: () => { reset(); setMode('choose'); },
        style: { display: 'flex', alignItems: 'center', gap: 5, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, marginBottom: 36, fontFamily: 'IBM Plex Sans, sans-serif', padding: 0 }
      }, React.createElement(Icon, { name: 'ChevronLeft', size: 14, color: C.muted }), 'Back'),
      React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 } }, isSignUp ? 'New account' : 'Sign in'),
      React.createElement('h2', { style: { fontSize: 22, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em', marginBottom: 6 } }, isSignUp ? 'Create your account' : 'Welcome back'),
      React.createElement('p', { style: { fontSize: 13, color: C.muted, marginBottom: 28 } },
        isSignUp ? "You'll set up your household profile right after this." : 'Sign in to access your Command dashboard.'
      ),
      error && React.createElement('div', {
        style: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }
      }, React.createElement('p', { style: { color: '#EF4444', fontSize: 13 } }, error)),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
        React.createElement('input', {
          type: 'email', placeholder: 'Email address', value: email,
          onChange: e => setEmail(e.target.value), style: inputStyle
        }),
        React.createElement('input', {
          type: 'password', placeholder: isSignUp ? 'Password (8+ characters)' : 'Password',
          value: password, onChange: e => setPassword(e.target.value),
          onKeyDown: e => e.key === 'Enter' && handleSubmit(), style: inputStyle
        })
      ),
      React.createElement('button', {
        onClick: handleSubmit, disabled: loading,
        style: {
          width: '100%', background: loading ? '#1a1b1e' : C.gold,
          color: loading ? '#4A4B4E' : C.black, fontWeight: 700, fontSize: 14,
          border: loading ? `1px solid ${C.border}` : 'none', borderRadius: 6,
          padding: '13px 20px', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'IBM Plex Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }
      }, loading
        ? React.createElement(React.Fragment, null,
            React.createElement('div', { style: { width: 14, height: 14, border: '2px solid #4A4B4E', borderTopColor: C.muted, borderRadius: '50%', animation: 'spin 0.8s linear infinite' } }),
            isSignUp ? 'Creating…' : 'Signing in…'
          )
        : (isSignUp ? 'Create account' : 'Sign in')
      ),
      React.createElement('p', { style: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 18 } },
        isSignUp ? 'Already have an account? ' : "Don't have an account? ",
        React.createElement('button', {
          onClick: () => { reset(); setMode(isSignUp ? 'signin' : 'signup'); },
          style: { color: C.gold, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'IBM Plex Sans, sans-serif' }
        }, isSignUp ? 'Sign in' : 'Create one')
      )
    )
  );
}

function AuthScreen({ onLogin }) {
  return React.createElement('div', {
    style: { display: 'flex', height: '100vh', overflow: 'hidden' }
  },
    React.createElement(AuthBrandPanel),
    React.createElement(AuthFormPanel, { onLogin })
  );
}

Object.assign(window, { AuthScreen });
