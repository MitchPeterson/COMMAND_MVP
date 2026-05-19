// Sidebar.jsx v2 — Command navigation
// Replaces broken PNG logo with inline SVG hub mark + wordmark
// Sidebar is pure navigation — brand presence via the hub icon + COMMAND text

const C = {
  black:    '#0F0F10',
  charcoal: '#1A1B1F',
  border:   '#2E2F34',
  muted:    '#9A9AA4',
  dim:      '#606068',
  offwhite: '#F0F0EE',
  gold:     '#C9A24D',
  goldHover:'#D4AE5A',
};

function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.5 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !window.lucide) return;
    ref.current.innerHTML = '';
    const nodes = lucide.icons[name];
    if (!nodes) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', color);
    svg.setAttribute('stroke-width', strokeWidth);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    // Lucide format: array of [tagName, attrs] tuples
    if (Array.isArray(nodes)) {
      for (const [tag, attrs] of nodes) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
        svg.appendChild(el);
      }
    }
    ref.current.appendChild(svg);
  }, [name, size, color, strokeWidth]);
  return React.createElement('span', { ref, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } });
}

// Hub mark — inline SVG, perfectly crisp at any size
function HubMark({ size = 22 }) {
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg', style: { flexShrink: 0 }
  },
    // Outer ring
    React.createElement('circle', { cx: '12', cy: '12', r: '10', stroke: C.gold, strokeWidth: '1.4' }),
    // Spokes to 8 nodes
    ...[[12,2],[19.1,5],[22,12],[19.1,19],[12,22],[4.9,19],[2,12],[4.9,5]].map(([x,y], i) =>
      React.createElement('line', { key: i, x1: '12', y1: '12', x2: String(x), y2: String(y), stroke: C.gold, strokeWidth: '1.2', strokeLinecap: 'round' })
    ),
    // Outer nodes
    ...[[12,2],[19.1,5],[22,12],[19.1,19],[12,22],[4.9,19],[2,12],[4.9,5]].map(([x,y], i) =>
      React.createElement('circle', { key: `n${i}`, cx: String(x), cy: String(y), r: '1.8', fill: C.gold })
    ),
    // Center node
    React.createElement('circle', { cx: '12', cy: '12', r: '2.8', fill: C.gold }),
    React.createElement('circle', { cx: '12', cy: '12', r: '1.4', fill: C.black })
  );
}

const navItems = [
  { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard' },
  { id: 'insurance',  icon: 'Shield',         label: 'Insurance' },
  { id: 'legal',      icon: 'FileText',        label: 'Legal' },
  { id: 'home',       icon: 'Home',            label: 'Home' },
  { id: 'finances',   icon: 'Wallet',          label: 'Finances' },
  { id: 'taxes',      icon: 'Receipt',         label: 'Taxes' },
  { id: 'family',     icon: 'Users',           label: 'Family' },
  { id: 'credit',     icon: 'CreditCard',      label: 'Credit' },
  { id: 'documents',  icon: 'Folder',          label: 'Documents' },
];

function Sidebar({ active, onNav }) {
  return React.createElement('nav', {
    style: {
      width: 200, minWidth: 200, height: '100%',
      background: C.black,
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }
  },
    // Logo lockup
    React.createElement('div', {
      style: {
        padding: '22px 18px 20px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 9,
      }
    },
      React.createElement(HubMark, { size: 22 }),
      React.createElement('div', null,
        React.createElement('div', {
          style: { fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: C.offwhite, lineHeight: 1 }
        }, 'COMMAND'),
        React.createElement('div', {
          style: { fontSize: 8, fontWeight: 600, letterSpacing: '0.08em', color: C.muted, marginTop: 3, textTransform: 'uppercase' }
        }, 'Household OS')
      )
    ),
    // Nav items
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '10px 8px' } },
      navItems.map(item => {
        const isActive = active === item.id;
        return React.createElement('button', {
          key: item.id,
          onClick: () => onNav(item.id),
          style: {
            display: 'flex', alignItems: 'center', gap: 9,
            width: '100%', padding: '8px 10px', borderRadius: 6,
            background: isActive ? 'rgba(201,162,77,0.08)' : 'transparent',
            border: 'none', cursor: 'pointer',
            color: isActive ? C.gold : C.muted,
            fontSize: 13, fontWeight: isActive ? 600 : 400,
            fontFamily: 'IBM Plex Sans, -apple-system, sans-serif',
            transition: 'all 150ms ease',
            marginBottom: 1,
            borderLeft: isActive ? `2px solid ${C.gold}` : '2px solid transparent',
          }
        },
          React.createElement(Icon, { name: item.icon, size: 15, color: isActive ? C.gold : '#4A4B4E' }),
          item.label
        );
      })
    ),
    // Profile
    React.createElement('div', {
      style: { padding: '12px 8px', borderTop: `1px solid ${C.border}` }
    },
      React.createElement('button', {
        onClick: () => onNav('profile'),
        style: {
          display: 'flex', alignItems: 'center', gap: 9,
          width: '100%', padding: '8px 10px', borderRadius: 6,
          background: active === 'profile' ? 'rgba(201,162,77,0.08)' : 'transparent',
          border: active === 'profile' ? 'none' : 'none',
          borderLeft: active === 'profile' ? `2px solid ${C.gold}` : '2px solid transparent',
          cursor: 'pointer', fontFamily: 'IBM Plex Sans, -apple-system, sans-serif',
          transition: 'all 150ms ease',
        }
      },
        React.createElement('div', {
          style: {
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(201,162,77,0.15)',
            border: `1px solid rgba(201,162,77,0.3)`,
            color: C.gold, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
          }
        }, 'AB'),
        React.createElement('div', { style: { textAlign: 'left', minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 12, fontWeight: 600, color: C.offwhite, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, 'Adam Bailey'),
          React.createElement('div', { style: { fontSize: 10, color: C.muted } }, 'Savage, MN')
        )
      )
    )
  );
}

Object.assign(window, { Sidebar, Icon, HubMark, C });
