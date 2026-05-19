// Insurance.jsx v2 — Command Insurance section
//
// Design pattern matches the new Dashboard:
// (1) Hero section — Total coverage exposure + premium summary (analogous to health score)
// (2) Recommendations — severity-grouped (Critical / High / Review)
// (3) Policy list — grouped by type with proper hierarchy
// (4) Detail view — coverage breakdown, recommendations, action CTA

const insurancePolicies = [
  { id: 'home-1',     type: 'home',     typeLabel: 'Property',  icon: 'Building2', name: 'Homeowners Insurance', carrier: 'State Farm',         policyNum: 'HO-2847591', premium: 2400, premiumPeriod: 'yr', deductible: 1000, coverage: '$750K dwelling',  renewal: 'Jun 15, 2026', status: 'active',   coverageAmt: 750000 },
  { id: 'auto-1',     type: 'auto',     typeLabel: 'Property',  icon: 'Car',       name: 'Auto Insurance',       carrier: 'State Farm',         policyNum: 'AU-9384756', premium: 2400, premiumPeriod: 'yr', deductible: 250,  coverage: '100/300/100',     renewal: 'Feb 2, 2026',  status: 'expiring', coverageAmt: 300000 },
  { id: 'umbrella-1', type: 'umbrella', typeLabel: 'Liability', icon: 'Umbrella',  name: 'Umbrella Policy',      carrier: 'State Farm',         policyNum: 'UM-1928374', premium: 350,  premiumPeriod: 'yr', deductible: 0,    coverage: '$1M limit',       renewal: 'Jun 15, 2026', status: 'gap',      coverageAmt: 1000000 },
  { id: 'life-1',     type: 'life',     typeLabel: 'Life',      icon: 'Heart',     name: 'Term Life Insurance',  carrier: 'Northwestern Mutual',policyNum: 'LF-7462951', premium: 85,   premiumPeriod: 'mo', deductible: 0,    coverage: '$1.5M death benefit', renewal: 'Dec 1, 2035', status: 'active', coverageAmt: 1500000 },
  { id: 'life-2',     type: 'life',     typeLabel: 'Life',      icon: 'Heart',     name: 'Term Life (Spouse)',   carrier: 'Northwestern Mutual',policyNum: 'LF-7462952', premium: 65,   premiumPeriod: 'mo', deductible: 0,    coverage: '$750K death benefit', renewal: 'Dec 1, 2035', status: 'active', coverageAmt: 750000 },
];

const policyGroups = [
  { id: 'liability', label: 'Liability Protection', policies: insurancePolicies.filter(p => p.type === 'umbrella') },
  { id: 'property',  label: 'Property & Auto',      policies: insurancePolicies.filter(p => ['home','auto'].includes(p.type)) },
  { id: 'life',      label: 'Life Insurance',       policies: insurancePolicies.filter(p => p.type === 'life') },
];

const insuranceStatusConfig = {
  active:   { label: 'Active',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  expiring: { label: 'Renews Feb 2', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  gap:      { label: 'Coverage Gap', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

const insuranceRecs = [
  { id: 'umbrella', severity: 'Critical', icon: 'AlertTriangle',
    title: 'Umbrella coverage gap of $1.8M',
    consequence: 'Your $1M umbrella covers 36% of your $2.8M net worth. A single liability judgment above that limit exposes personal assets including your home, investments, and retirement accounts.',
    action: 'Increase to $3M umbrella' },
  { id: 'auto', severity: 'High', icon: 'TrendingDown',
    title: 'Auto renewal locks in 12% increase',
    consequence: 'Renewal is Feb 2 — 12 days away. Current carrier increase locks in $290/year more than market. Comparable coverage available at $1,950/year with two competing carriers.',
    action: 'Compare quotes now' },
];

const totalAnnualPremium = insurancePolicies.reduce((sum, p) => sum + (p.premiumPeriod === 'yr' ? p.premium : p.premium * 12), 0);
const totalCoverage = insurancePolicies.reduce((sum, p) => sum + p.coverageAmt, 0);

const fmt = n => n >= 1000000 ? `$${(n/1000000).toFixed(n % 1000000 === 0 ? 1 : 2)}M` : `$${(n/1000).toFixed(0)}K`;
const fmtMoney = n => `$${n.toLocaleString()}`;

// ── Insurance Hero ─────────────────────────────────────────────────────────────
function InsuranceHero() {
  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', gap: 48 }
  },
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Total Coverage'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
        React.createElement('span', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, fmt(totalCoverage)),
      ),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, `Across ${insurancePolicies.length} policies`)
    ),
    React.createElement('div', { style: { width: 1, height: 56, background: C.border } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Annual Premium'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
        React.createElement('span', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, fmtMoney(totalAnnualPremium)),
      ),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, `${fmtMoney(Math.round(totalAnnualPremium/12))}/mo total`)
    ),
    React.createElement('div', { style: { flex: 1 } }),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, paddingBottom: 2 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' } },
        React.createElement('div', { style: { width: 7, height: 7, borderRadius: '50%', background: '#EF4444' } }),
        React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: '#FF6B6B' } }, '1 critical gap'),
      ),
      React.createElement('button', {
        style: { display: 'flex', alignItems: 'center', gap: 7, background: C.gold, color: C.black, border: 'none', borderRadius: 7, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', whiteSpace: 'nowrap' }
      }, React.createElement(Icon, { name: 'Plus', size: 14, color: C.black }), 'Add Policy')
    )
  );
}

// ── Recommendations ────────────────────────────────────────────────────────────
function InsuranceRecs({ onSelect }) {
  return React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Recommendations'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      insuranceRecs.map(r => {
        const cfg = impactConfig[r.severity] || impactConfig.Medium;
        return React.createElement('div', {
          key: r.id,
          style: { display: 'flex', gap: 14, padding: '16px 18px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', transition: 'border-color 150ms' },
          onMouseEnter: e => e.currentTarget.style.borderColor = '#484950',
          onMouseLeave: e => e.currentTarget.style.borderColor = C.border,
        },
          React.createElement('div', {
            style: { width: 30, height: 30, borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
          }, React.createElement(Icon, { name: r.icon, size: 14, color: cfg.color })),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
              React.createElement('span', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: cfg.color } }, cfg.label),
              React.createElement('div', { style: { width: 3, height: 3, borderRadius: '50%', background: C.border } }),
              React.createElement('span', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite, letterSpacing: '-0.005em' } }, r.title),
            ),
            React.createElement('p', { style: { fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 10 } }, r.consequence),
            React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: C.gold } }, `${r.action} →`)
          )
        );
      })
    )
  );
}

// ── Policy Row ─────────────────────────────────────────────────────────────────
function PolicyRow({ p, onSelect }) {
  const cfg = insuranceStatusConfig[p.status];
  return React.createElement('div', {
    onClick: () => onSelect(p),
    style: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', transition: 'border-color 150ms' },
    onMouseEnter: e => e.currentTarget.style.borderColor = '#484950',
    onMouseLeave: e => e.currentTarget.style.borderColor = C.border,
  },
    React.createElement('div', { style: { width: 32, height: 32, borderRadius: 6, background: 'rgba(201,162,77,0.1)', border: `1px solid rgba(201,162,77,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
      React.createElement(Icon, { name: p.icon, size: 14, color: C.gold })
    ),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite, marginBottom: 3 } }, p.name),
      React.createElement('div', { style: { fontSize: 12, color: C.muted } }, `${p.carrier} · ${p.policyNum}`)
    ),
    React.createElement('div', { style: { textAlign: 'right', minWidth: 110 } },
      React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: C.offwhite } }, p.coverage),
      React.createElement('div', { style: { fontSize: 11, color: C.muted, marginTop: 3 } }, `Renews ${p.renewal}`)
    ),
    React.createElement('div', { style: { textAlign: 'right', minWidth: 95 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 700, color: C.offwhite } }, `$${p.premium.toLocaleString()}`),
      React.createElement('div', { style: { fontSize: 11, color: C.muted, marginTop: 3 } }, `per ${p.premiumPeriod === 'yr' ? 'year' : 'month'}`)
    ),
    React.createElement('span', {
      style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', minWidth: 110, textAlign: 'center' }
    }, cfg.label),
    React.createElement(Icon, { name: 'ChevronRight', size: 14, color: C.dim })
  );
}

// ── Policy Group ───────────────────────────────────────────────────────────────
function PolicyGroup({ group, onSelect }) {
  if (!group.policies.length) return null;
  const groupTotal = group.policies.reduce((sum, p) => sum + (p.premiumPeriod === 'yr' ? p.premium : p.premium * 12), 0);
  return React.createElement('div', { style: { marginBottom: 22 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
      React.createElement('span', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted } }, group.label),
      React.createElement('div', { style: { flex: 1, height: 1, background: C.border } }),
      React.createElement('span', { style: { fontSize: 11, color: C.dim } }, `${group.policies.length} polic${group.policies.length === 1 ? 'y' : 'ies'} · ${fmtMoney(groupTotal)}/yr`)
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      group.policies.map(p => React.createElement(PolicyRow, { key: p.id, p, onSelect }))
    )
  );
}

// ── Policy Detail ──────────────────────────────────────────────────────────────
function PolicyDetail({ p, onBack }) {
  const cfg = insuranceStatusConfig[p.status];
  const isAnnualPremium = p.premiumPeriod === 'yr';
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto' } },
    React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
      React.createElement('button', {
        onClick: onBack,
        style: { display: 'flex', alignItems: 'center', gap: 5, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 20, fontFamily: 'IBM Plex Sans, sans-serif', padding: 0 }
      }, React.createElement(Icon, { name: 'ChevronLeft', size: 15, color: C.muted }), 'Insurance'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 } },
        React.createElement('div', { style: { display: 'flex', gap: 16 } },
          React.createElement('div', { style: { width: 48, height: 48, borderRadius: 10, background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
            React.createElement(Icon, { name: p.icon, size: 20, color: C.gold })
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 5 } }, p.typeLabel),
            React.createElement('h1', { style: { fontSize: 22, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em', marginBottom: 5 } }, p.name),
            React.createElement('div', { style: { fontSize: 13, color: C.muted } }, `${p.carrier} · ${p.policyNum}`)
          )
        ),
        React.createElement('span', {
          style: { fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }
        }, cfg.label)
      )
    ),
    React.createElement('div', { style: { padding: '24px 32px' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 } },
        [
          ['Coverage', p.coverage, C.offwhite],
          ['Premium', `${fmtMoney(p.premium)}/${isAnnualPremium ? 'yr' : 'mo'}`, C.offwhite],
          ['Deductible', p.deductible ? fmtMoney(p.deductible) : 'N/A', C.offwhite],
          ['Renewal', p.renewal, p.status === 'expiring' ? '#F59E0B' : C.offwhite],
        ].map(([label, val, color]) =>
          React.createElement('div', { key: label, style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' } },
            React.createElement('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, marginBottom: 8 } }, label),
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color, letterSpacing: '-0.01em' } }, val)
          )
        )
      ),
      p.status === 'gap' && React.createElement('div', {
        style: { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
          React.createElement(Icon, { name: 'AlertTriangle', size: 14, color: '#FF6B6B' }),
          React.createElement('span', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#FF6B6B' } }, 'COVERAGE GAP IDENTIFIED'),
        ),
        React.createElement('p', { style: { fontSize: 14, color: C.offwhite, lineHeight: 1.65, marginBottom: 12 } },
          'Your $1M umbrella covers 36% of your $2.8M net worth. A single liability judgment exceeding $1M attaches directly to personal assets including home equity, investment accounts, and retirement funds.'
        ),
        React.createElement('button', {
          style: { display: 'flex', alignItems: 'center', gap: 6, background: C.gold, color: C.black, border: 'none', borderRadius: 7, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
        }, 'Increase coverage to $3M', React.createElement(Icon, { name: 'ArrowRight', size: 13, color: C.black }))
      )
    )
  );
}

// ── Main Insurance View ────────────────────────────────────────────────────────
function InsuranceView() {
  const [selected, setSelected] = React.useState(null);
  if (selected) return React.createElement(PolicyDetail, { p: selected, onBack: () => setSelected(null) });

  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(InsuranceHero),
    React.createElement(InsuranceRecs, { onSelect: setSelected }),
    React.createElement('div', { style: { padding: '24px 32px' } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 18 } }, 'Active Policies'),
      policyGroups.map(g => React.createElement(PolicyGroup, { key: g.id, group: g, onSelect: setSelected }))
    )
  );
}

Object.assign(window, { InsuranceView });
