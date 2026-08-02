// Home.jsx — Command Home section
//
// Home assets with maintenance tracking. Hero shows total home value at risk
// and replacement reserves needed. Asset list grouped by category with age
// vs lifespan visualization. Critical assets (HVAC near EOL) flagged.

const homeAssets = [
  { id: 'hvac-1',    cat: 'hvac',       name: 'HVAC System',         brand: 'Carrier',     icon: 'Thermometer', age: 14, lifespan: 18, cost: 8500, status: 'fair',      lastService: 'Oct 2025', condition: 'Replace Soon' },
  { id: 'furnace-1', cat: 'hvac',       name: 'Furnace',             brand: 'Carrier',     icon: 'Flame',        age: 14, lifespan: 20, cost: 4500, status: 'good',      lastService: 'Oct 2025', condition: 'Good' },
  { id: 'roof-1',    cat: 'structure',  name: 'Roof',                brand: 'GAF',         icon: 'Home',         age: 3,  lifespan: 30, cost: 18000, status: 'excellent', lastService: 'Aug 2024', condition: 'Excellent' },
  { id: 'wh-1',      cat: 'plumbing',   name: 'Water Heater',        brand: 'Rheem',       icon: 'Droplets',     age: 8,  lifespan: 12, cost: 1800, status: 'good',      lastService: 'Nov 2024', condition: 'Monitor' },
  { id: 'fridge-1',  cat: 'appliance',  name: 'Refrigerator',        brand: 'Samsung',     icon: 'Refrigerator', age: 5,  lifespan: 15, cost: 2800, status: 'excellent', lastService: null,        condition: 'Excellent' },
  { id: 'wd-1',      cat: 'appliance',  name: 'Washer & Dryer',      brand: 'LG',          icon: 'CircleDot',    age: 5,  lifespan: 12, cost: 2200, status: 'excellent', lastService: null,        condition: 'Excellent' },
  { id: 'dish-1',    cat: 'appliance',  name: 'Dishwasher',          brand: 'Bosch',       icon: 'Droplets',     age: 7,  lifespan: 12, cost: 1200, status: 'good',      lastService: null,        condition: 'Good' },
  { id: 'gar-1',     cat: 'exterior',   name: 'Garage Door Opener',  brand: 'LiftMaster',  icon: 'Home',         age: 7,  lifespan: 15, cost: 650,  status: 'good',      lastService: 'Jun 2024', condition: 'Good' },
];

const homeGroups = [
  { id: 'hvac',      label: 'HVAC & Climate',      assets: homeAssets.filter(a => a.cat === 'hvac') },
  { id: 'structure', label: 'Structure & Exterior', assets: homeAssets.filter(a => a.cat === 'structure' || a.cat === 'exterior') },
  { id: 'plumbing',  label: 'Plumbing',            assets: homeAssets.filter(a => a.cat === 'plumbing') },
  { id: 'appliance', label: 'Appliances',          assets: homeAssets.filter(a => a.cat === 'appliance') },
];

const homeStatusConfig = {
  excellent:    { color: '#22C55E', label: 'Excellent' },
  good:         { color: '#3B82F6', label: 'Good' },
  fair:         { color: '#EAB308', label: 'Fair' },
  poor:         { color: '#F97316', label: 'Poor' },
};

const totalReplacementValue = homeAssets.reduce((s, a) => s + a.cost, 0);
const replaceSoon = homeAssets.filter(a => a.age / a.lifespan > 0.75);

function HomeHero() {
  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', gap: 48 }
  },
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Property Value'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, '$750K'),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, '1847 Oakwood Dr · Built 2008')
    ),
    React.createElement('div', { style: { width: 1, height: 56, background: C.border } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Replacement Reserve'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, `$${(totalReplacementValue/1000).toFixed(1)}K`),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, `Across ${homeAssets.length} tracked systems`)
    ),
    React.createElement('div', { style: { flex: 1 } }),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 } },
      replaceSoon.length > 0 && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#EAB308' } }),
        React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: '#EAB308' } }, `${replaceSoon.length} approaching end-of-life`),
      ),
      React.createElement('button', {
        style: { display: 'flex', alignItems: 'center', gap: 7, background: C.gold, color: C.black, border: 'none', borderRadius: 7, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
      }, React.createElement(Icon, { name: 'Plus', size: 14, color: C.black }), 'Add Asset')
    )
  );
}

function HomeAlert() {
  return React.createElement('div', {
    style: { margin: '24px 32px 0', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, padding: '16px 20px' }
  },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
      React.createElement(Icon, { name: 'AlertCircle', size: 14, color: '#EAB308' }),
      React.createElement('span', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#EAB308' } }, 'PLANNED REPLACEMENT WINDOW'),
    ),
    React.createElement('h3', { style: { fontSize: 15, fontWeight: 700, color: C.offwhite, marginBottom: 6, letterSpacing: '-0.005em' } }, 'HVAC system at 78% of expected lifespan'),
    React.createElement('p', { style: { fontSize: 13, color: C.muted, lineHeight: 1.6 } },
      'Your Carrier HVAC is 14 years old; expected lifespan 15–20 years. Planning replacement in 18 months avoids emergency cost premium (typically 30% higher). Budget $8,500 to start reserve funding.'
    )
  );
}

function LifespanBar({ age, lifespan, status }) {
  const pct = Math.min(100, (age / lifespan) * 100);
  const color = pct > 80 ? '#EF4444' : pct > 65 ? '#EAB308' : pct > 40 ? '#3B82F6' : '#22C55E';
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 110 } },
    React.createElement('div', { style: { flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' } },
      React.createElement('div', { style: { width: `${pct}%`, height: '100%', background: color, transition: 'width 300ms' } })
    ),
    React.createElement('span', { style: { fontSize: 11, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', minWidth: 50 } }, `${age}/${lifespan}y`)
  );
}

function HomeAssetRow({ a, onSelect }) {
  const cfg = homeStatusConfig[a.status];
  return React.createElement('div', {
    onClick: () => onSelect(a),
    style: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', transition: 'border-color 150ms' },
    onMouseEnter: e => e.currentTarget.style.borderColor = '#484950',
    onMouseLeave: e => e.currentTarget.style.borderColor = C.border,
  },
    React.createElement('div', { style: { width: 32, height: 32, borderRadius: 6, background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
      React.createElement(Icon, { name: a.icon, size: 14, color: C.gold })
    ),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite, marginBottom: 3 } }, a.name),
      React.createElement('div', { style: { fontSize: 12, color: C.muted } }, a.brand)
    ),
    React.createElement(LifespanBar, { age: a.age, lifespan: a.lifespan, status: a.status }),
    React.createElement('div', { style: { textAlign: 'right', minWidth: 90 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: C.offwhite } }, `$${a.cost.toLocaleString()}`),
      React.createElement('div', { style: { fontSize: 11, color: C.muted, marginTop: 2 } }, 'replacement')
    ),
    React.createElement('span', {
      style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: `${cfg.color}1A`, color: cfg.color, border: `1px solid ${cfg.color}40`, whiteSpace: 'nowrap', minWidth: 92, textAlign: 'center' }
    }, a.condition),
    React.createElement(Icon, { name: 'ChevronRight', size: 14, color: C.dim })
  );
}

function HomeGroup({ group, onSelect }) {
  return React.createElement('div', { style: { marginBottom: 22 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
      React.createElement('span', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted } }, group.label),
      React.createElement('div', { style: { flex: 1, height: 1, background: C.border } }),
      React.createElement('span', { style: { fontSize: 11, color: C.dim } }, `${group.assets.length} asset${group.assets.length === 1 ? '' : 's'}`)
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      group.assets.map(a => React.createElement(HomeAssetRow, { key: a.id, a, onSelect }))
    )
  );
}

function HomeAssetDetail({ a, onBack }) {
  const cfg = homeStatusConfig[a.status];
  const pct = Math.min(100, (a.age / a.lifespan) * 100);
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto' } },
    React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
      React.createElement('button', { onClick: onBack,
        style: { display: 'flex', alignItems: 'center', gap: 5, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 20, fontFamily: 'IBM Plex Sans, sans-serif', padding: 0 }
      }, React.createElement(Icon, { name: 'ChevronLeft', size: 15, color: C.muted }), 'Home'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 } },
        React.createElement('div', { style: { display: 'flex', gap: 16 } },
          React.createElement('div', { style: { width: 48, height: 48, borderRadius: 10, background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
            React.createElement(Icon, { name: a.icon, size: 20, color: C.gold })
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 5 } }, 'Home Asset'),
            React.createElement('h1', { style: { fontSize: 22, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em', marginBottom: 5 } }, a.name),
            React.createElement('div', { style: { fontSize: 13, color: C.muted } }, a.brand)
          )
        ),
        React.createElement('span', { style: { fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: `${cfg.color}1A`, color: cfg.color, border: `1px solid ${cfg.color}40`, whiteSpace: 'nowrap' } }, a.condition)
      )
    ),
    React.createElement('div', { style: { padding: '24px 32px' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 } },
        [
          ['Age', `${a.age} years`],
          ['Lifespan', `${a.lifespan} years`],
          ['Replacement', `$${a.cost.toLocaleString()}`],
          ['Last Service', a.lastService || 'No record'],
        ].map(([label, val]) =>
          React.createElement('div', { key: label, style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' } },
            React.createElement('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 8 } }, label),
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em' } }, val)
          )
        )
      ),
      React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' } },
        React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Lifespan'),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 } },
          React.createElement('span', { style: { fontSize: 24, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.02em' } }, `${pct.toFixed(0)}%`),
          React.createElement('span', { style: { fontSize: 13, color: C.muted } }, 'of expected lifespan used')
        ),
        React.createElement('div', { style: { height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' } },
          React.createElement('div', { style: { width: `${pct}%`, height: '100%', background: pct > 80 ? '#EF4444' : pct > 65 ? '#EAB308' : '#22C55E' } })
        )
      )
    )
  );
}

function HomeView() {
  const [selected, setSelected] = React.useState(null);
  if (selected) return React.createElement(HomeAssetDetail, { a: selected, onBack: () => setSelected(null) });

  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(HomeHero),
    React.createElement(HomeAlert),
    React.createElement('div', { style: { padding: '24px 32px' } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 18 } }, 'Tracked Systems'),
      homeGroups.map(g => React.createElement(HomeGroup, { key: g.id, group: g, onSelect: setSelected }))
    )
  );
}

Object.assign(window, { HomeView });
