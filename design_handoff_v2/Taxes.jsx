// Taxes.jsx — Command Taxes section
//
// 2025 tax year overview, recommendations, document collection status, CPA strip.
// Hero shows total reported income + recoverable savings opportunity.

const taxDocs = [
  { name: 'W-2 — Primary',          source: 'Acme Corp',      amount: 285000, status: 'received' },
  { name: 'W-2 — Spouse',           source: 'Metro Health',   amount: 40000,  status: 'received' },
  { name: '1099-INT — Bank',        source: 'Chase',          amount: 1250,   status: 'received' },
  { name: '1099-DIV — Dividends',   source: 'Vanguard',       amount: 8500,   status: 'received' },
  { name: '1099-NEC — Consulting',  source: 'Various',        amount: 45000,  status: 'received' },
  { name: '1099-B — Stock Sales',   source: 'Fidelity',       amount: null,   status: 'pending' },
  { name: 'Mortgage Interest',      source: 'Wells Fargo',    amount: 18500,  status: 'received' },
  { name: 'Property Tax',           source: 'Scott County',   amount: 8200,   status: 'received' },
];

const taxRecs = [
  { id: 1, severity: 'High',   icon: 'TrendingUp',   title: 'Maximize 401(k) before Dec 31', savings: 875,  desc: 'Contributing $2,500 more captures additional tax-deferred savings.' },
  { id: 2, severity: 'High',   icon: 'TrendingDown', title: 'Harvest $12K in investment losses', savings: 2400, desc: 'Realize losses before Dec 31 to offset 2025 capital gains.' },
  { id: 3, severity: 'Medium', icon: 'Heart',         title: 'HSA contribution room',          savings: 1155, desc: 'Family limit is $8,300 — you have $3,300 in unused capacity.' },
  { id: 4, severity: 'Medium', icon: 'Calendar',      title: 'Q1 estimated payment due Apr 15', savings: 0,    desc: 'Consulting income up $45K — verify withholding with CPA.' },
];

const totalIncome = taxDocs.reduce((s, d) => s + (d.amount || 0), 0);
const totalSavings = taxRecs.reduce((s, r) => s + r.savings, 0);
const receivedCount = taxDocs.filter(d => d.status === 'received').length;

function TaxHero() {
  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', gap: 48 }
  },
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, '2025 Reported Income'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, `$${(totalIncome/1000).toFixed(0)}K`),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, 'From W-2, 1099, and investment sources')
    ),
    React.createElement('div', { style: { width: 1, height: 56, background: C.border } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Recoverable Savings'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: '#22C55E', letterSpacing: '-0.03em', lineHeight: 1 } }, `$${totalSavings.toLocaleString()}`),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, 'Across 4 actionable items')
    ),
    React.createElement('div', { style: { flex: 1 } }),
    React.createElement('div', { style: { textAlign: 'right' } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 } }, 'Filing Deadline'),
      React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: '#EAB308', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.01em' } }, 'Apr 15, 2026')
    )
  );
}

function TaxCPA() {
  return React.createElement('div', {
    style: { margin: '24px 32px 0', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }
  },
    React.createElement('div', { style: { width: 40, height: 40, borderRadius: '50%', background: 'rgba(201,162,77,0.12)', border: '1px solid rgba(201,162,77,0.25)', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 } }, 'MC'),
    React.createElement('div', { style: { flex: 1 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite } }, 'Michael Chen, CPA'),
      React.createElement('div', { style: { fontSize: 12, color: C.muted, marginTop: 2 } }, 'Chen & Associates · Last filing: April 2025')
    ),
    React.createElement('button', {
      style: { fontSize: 12, fontWeight: 600, color: C.gold, background: 'rgba(201,162,77,0.08)', border: `1px solid rgba(201,162,77,0.25)`, borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
    }, 'Contact')
  );
}

function TaxRecs() {
  return React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted } }, 'Tax Recommendations'),
      React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: '#22C55E' } }, `+$${totalSavings.toLocaleString()} potential`)
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      taxRecs.map(r => {
        const cfg = impactConfig[r.severity];
        return React.createElement('div', {
          key: r.id,
          style: { display: 'flex', gap: 14, padding: '14px 18px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', transition: 'border-color 150ms' },
          onMouseEnter: e => e.currentTarget.style.borderColor = '#484950',
          onMouseLeave: e => e.currentTarget.style.borderColor = C.border,
        },
          React.createElement('div', { style: { width: 30, height: 30, borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
            React.createElement(Icon, { name: r.icon, size: 13, color: cfg.color })
          ),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 } },
              React.createElement('span', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite } }, r.title),
            ),
            React.createElement('p', { style: { fontSize: 12, color: C.muted, lineHeight: 1.55 } }, r.desc)
          ),
          r.savings > 0 && React.createElement('div', { style: { textAlign: 'right', minWidth: 80 } },
            React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: '#22C55E', fontFamily: 'IBM Plex Mono, monospace' } }, `+$${r.savings}`),
            React.createElement('div', { style: { fontSize: 11, color: C.muted, marginTop: 2 } }, 'savings')
          )
        );
      })
    )
  );
}

function TaxDocs() {
  return React.createElement('div', { style: { padding: '24px 32px' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted } }, 'Tax Documents'),
      React.createElement('span', { style: { fontSize: 12, color: C.muted } }, `${receivedCount} of ${taxDocs.length} received`)
    ),
    React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' } },
      taxDocs.map((d, i) => React.createElement('div', {
        key: d.name,
        style: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }
      },
        React.createElement('div', { style: { width: 6, height: 6, borderRadius: '50%', background: d.status === 'received' ? '#22C55E' : '#EAB308', flexShrink: 0 } }),
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontSize: 13, fontWeight: 500, color: C.offwhite } }, d.name),
          React.createElement('div', { style: { fontSize: 11, color: C.muted, marginTop: 2 } }, d.source)
        ),
        React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: d.amount ? C.offwhite : C.muted, fontFamily: 'IBM Plex Mono, monospace', minWidth: 90, textAlign: 'right' } }, d.amount ? `$${d.amount.toLocaleString()}` : '—'),
        React.createElement('span', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: d.status === 'received' ? '#22C55E' : '#EAB308', textTransform: 'uppercase', minWidth: 70, textAlign: 'right' } }, d.status)
      ))
    )
  );
}

function TaxesView() {
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(TaxHero),
    React.createElement(TaxCPA),
    React.createElement(TaxRecs),
    React.createElement(TaxDocs)
  );
}

Object.assign(window, { TaxesView });
