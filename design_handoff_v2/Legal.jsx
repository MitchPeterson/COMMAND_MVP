// Legal.jsx v2 — Command Legal section
//
// Design pattern matches Dashboard + Insurance:
// (1) Hero — estate exposure as the dominant metric (analogous to health score / total coverage)
// (2) Critical alert — the absent trust, with quantified cost of inaction
// (3) Attorney card — primary contact strip
// (4) Documents grouped by purpose (Estate / Directives / Designations)
// (5) Detail — recommendations as numbered actions with consequence framing

const legalDocs = [
  { id: 'will-1',    group: 'estate',       icon: 'ScrollText',     name: 'Last Will and Testament',  status: 'needs-review',   lastUpdated: 'March 15, 2019', age: '7 years old',
    summary: 'Distributes assets equally between spouse and children. Names Sarah Bailey as executor with guardian designation for minor children.',
    consequence: 'Pre-dates your current $2.8M net worth (was $1.2M at drafting). Without updates, distribution may not reflect current asset composition. Children are now 9 and 12 — guardian designation may need review.',
    recs: ['Update to reflect current $2.8M net worth', 'Review guardian designations for children at ages 9 and 12', 'Coordinate with new trust once established'] },
  { id: 'trust-1',   group: 'estate',       icon: 'FileSignature',  name: 'Revocable Living Trust',   status: 'not-established', lastUpdated: null, age: 'Not established',
    summary: 'No trust currently in place. With $2.8M in assets, a revocable living trust avoids probate, maintains privacy, and provides structured distribution.',
    consequence: 'Without a trust, your estate goes through probate — a public, attorney-driven process costing $15,000–$40,000 and taking 12–18 months. Beneficiaries cannot access assets during this period.',
    recs: ['PRIORITY: Establish revocable living trust', 'Avoid $15K–$40K in probate costs', 'Schedule with attorney within 30 days'] },
  { id: 'hc-1',      group: 'directives',   icon: 'Heart',          name: 'Healthcare Directive',      status: 'outdated',       lastUpdated: 'March 15, 2019', age: '7 years old',
    summary: 'Names Sarah Bailey as primary healthcare agent. Sarah\'s mother named as alternate.',
    consequence: 'Alternate agent (Sarah\'s mother) is now 72 and may not be best positioned to make critical medical decisions. Healthcare preferences may also need updates given changes in personal circumstances.',
    recs: ['Confirm healthcare preferences still accurate', 'Update alternate agent designation', 'File copies with primary care physician'] },
  { id: 'poa-1',     group: 'directives',   icon: 'Scale',          name: 'Financial Power of Attorney', status: 'needs-review', lastUpdated: 'March 15, 2019', age: '7 years old',
    summary: 'Durable financial POA grants Sarah Bailey broad authority over financial affairs if you are incapacitated.',
    consequence: 'Does not include provisions for digital assets — cryptocurrency, online accounts, cloud storage — which are now substantial. Scope of powers may need updates for new account types acquired since 2019.',
    recs: ['Add digital asset management provisions', 'Designate successor agent', 'Verify acceptance by current financial institutions'] },
  { id: 'ben-1',     group: 'designations', icon: 'ClipboardList',  name: 'Beneficiary Designations',  status: 'needs-review',   lastUpdated: 'Mixed', age: 'Last reviewed 2019',
    summary: 'Designations across retirement accounts (401k, IRAs), life insurance, and investment accounts. Last comprehensive review: 2019.',
    consequence: 'Beneficiary designations override your will. Outdated designations on a major retirement account can redirect hundreds of thousands of dollars contrary to your current intentions.',
    recs: ['Audit all retirement account beneficiaries', 'Confirm life insurance beneficiaries', 'Align designations with estate plan'] },
];

const legalGroups = [
  { id: 'estate',       label: 'Estate Documents',      docs: legalDocs.filter(d => d.group === 'estate') },
  { id: 'directives',   label: 'Directives',            docs: legalDocs.filter(d => d.group === 'directives') },
  { id: 'designations', label: 'Beneficiary Designations', docs: legalDocs.filter(d => d.group === 'designations') },
];

const legalStatusConfig = {
  'current':         { label: 'Current',         color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  'needs-review':    { label: 'Needs Review',    color: '#EAB308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.25)' },
  'outdated':        { label: 'Outdated',        color: '#F97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)' },
  'not-established': { label: 'Not Established', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

// ── Legal Hero ─────────────────────────────────────────────────────────────────
function LegalHero() {
  const score = 4.0;
  const needsAttention = legalDocs.filter(d => d.status !== 'current').length;
  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', gap: 48 }
  },
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Estate Exposure'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 16 } },
        React.createElement('span', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, '$2.8M'),
        React.createElement('span', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#FF6B6B' } }, 'AT RISK')
      ),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, 'Net worth without trust protection')
    ),
    React.createElement('div', { style: { width: 1, height: 56, background: C.border } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Section Score'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10 } },
        React.createElement('span', { style: { fontSize: 56, fontWeight: 700, color: '#EF4444', letterSpacing: '-0.03em', lineHeight: 1 } }, score.toFixed(1)),
        React.createElement('span', { style: { fontSize: 18, fontWeight: 500, color: C.dim, letterSpacing: '-0.02em' } }, '/ 10')
      ),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, `${needsAttention} of ${legalDocs.length} need attention`)
    ),
    React.createElement('div', { style: { flex: 1 } }),
    React.createElement('button', {
      style: { display: 'flex', alignItems: 'center', gap: 7, background: C.gold, color: C.black, border: 'none', borderRadius: 7, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', alignSelf: 'flex-end', marginBottom: 4 }
    }, React.createElement(Icon, { name: 'Plus', size: 14, color: C.black }), 'Upload Document')
  );
}

// ── Critical Alert ─────────────────────────────────────────────────────────────
function CriticalAlert() {
  return React.createElement('div', {
    style: { margin: '0 32px', marginTop: 24, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '18px 22px' }
  },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
      React.createElement(Icon, { name: 'AlertTriangle', size: 14, color: '#FF6B6B' }),
      React.createElement('span', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#FF6B6B' } }, 'TOP PRIORITY · ESTATE PLANNING GAP'),
    ),
    React.createElement('h3', { style: { fontSize: 16, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.005em', marginBottom: 8 } },
      'No living trust established for a $2.8M estate'
    ),
    React.createElement('p', { style: { fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 14 } },
      'Without a revocable living trust, your estate enters probate — a public, attorney-driven process. For an estate your size, expect $15,000–$40,000 in legal costs and 12–18 months before beneficiaries can access assets.'
    ),
    React.createElement('div', { style: { display: 'flex', gap: 10 } },
      React.createElement('button', {
        style: { display: 'flex', alignItems: 'center', gap: 6, background: C.gold, color: C.black, border: 'none', borderRadius: 7, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
      }, 'Schedule attorney consultation', React.createElement(Icon, { name: 'ArrowRight', size: 13, color: C.black })),
      React.createElement('button', {
        style: { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
      }, 'Learn more')
    )
  );
}

// ── Attorney Card ──────────────────────────────────────────────────────────────
function AttorneyCard() {
  return React.createElement('div', {
    style: { margin: '14px 32px 0', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }
  },
    React.createElement('div', { style: { width: 40, height: 40, borderRadius: '50%', background: 'rgba(201,162,77,0.12)', border: '1px solid rgba(201,162,77,0.25)', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 } }, 'JM'),
    React.createElement('div', { style: { flex: 1 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite } }, 'Jennifer Morrison, Esq.'),
      React.createElement('div', { style: { fontSize: 12, color: C.muted, marginTop: 2 } }, 'Morrison & Associates · Estate Planning · Last contact: March 2019')
    ),
    React.createElement('button', {
      style: { fontSize: 12, fontWeight: 600, color: C.gold, background: 'rgba(201,162,77,0.08)', border: `1px solid rgba(201,162,77,0.25)`, borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
    }, 'Contact')
  );
}

// ── Document Row ───────────────────────────────────────────────────────────────
function LegalDocRow({ doc, onSelect }) {
  const cfg = legalStatusConfig[doc.status];
  const isCritical = doc.status === 'not-established';
  return React.createElement('div', {
    onClick: () => onSelect(doc),
    style: {
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      background: C.charcoal,
      border: `1px solid ${isCritical ? cfg.border : C.border}`,
      borderLeft: isCritical ? `3px solid ${cfg.color}` : `1px solid ${C.border}`,
      borderRadius: 8, cursor: 'pointer', transition: 'border-color 150ms',
    },
    onMouseEnter: e => { if (!isCritical) e.currentTarget.style.borderColor = '#484950'; },
    onMouseLeave: e => { if (!isCritical) e.currentTarget.style.borderColor = C.border; },
  },
    React.createElement('div', { style: { width: 32, height: 32, borderRadius: 6, background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
      React.createElement(Icon, { name: doc.icon, size: 14, color: C.gold })
    ),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite, marginBottom: 3 } }, doc.name),
      React.createElement('div', { style: { fontSize: 12, color: C.muted } }, doc.age)
    ),
    React.createElement('span', {
      style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', minWidth: 130, textAlign: 'center' }
    }, cfg.label),
    React.createElement(Icon, { name: 'ChevronRight', size: 14, color: C.dim })
  );
}

// ── Document Group ─────────────────────────────────────────────────────────────
function LegalDocGroup({ group, onSelect }) {
  return React.createElement('div', { style: { marginBottom: 22 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
      React.createElement('span', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted } }, group.label),
      React.createElement('div', { style: { flex: 1, height: 1, background: C.border } }),
      React.createElement('span', { style: { fontSize: 11, color: C.dim } }, `${group.docs.length} document${group.docs.length === 1 ? '' : 's'}`)
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      group.docs.map(d => React.createElement(LegalDocRow, { key: d.id, doc: d, onSelect }))
    )
  );
}

// ── Document Detail ────────────────────────────────────────────────────────────
function LegalDocDetail({ doc, onBack }) {
  const cfg = legalStatusConfig[doc.status];
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto' } },
    React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
      React.createElement('button', {
        onClick: onBack,
        style: { display: 'flex', alignItems: 'center', gap: 5, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 20, fontFamily: 'IBM Plex Sans, sans-serif', padding: 0 }
      }, React.createElement(Icon, { name: 'ChevronLeft', size: 15, color: C.muted }), 'Legal'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 } },
        React.createElement('div', { style: { display: 'flex', gap: 16 } },
          React.createElement('div', { style: { width: 48, height: 48, borderRadius: 10, background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
            React.createElement(Icon, { name: doc.icon, size: 20, color: C.gold })
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 5 } }, 'Legal Document'),
            React.createElement('h1', { style: { fontSize: 22, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em', marginBottom: 5 } }, doc.name),
            React.createElement('div', { style: { fontSize: 13, color: C.muted } }, doc.lastUpdated ? `Last updated: ${doc.lastUpdated}` : 'Not yet established')
          )
        ),
        React.createElement('span', {
          style: { fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }
        }, cfg.label)
      )
    ),
    React.createElement('div', { style: { padding: '24px 32px' } },
      // Summary
      React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 12 } },
        React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 } }, 'Current State'),
        React.createElement('p', { style: { fontSize: 14, color: C.offwhite, lineHeight: 1.7 } }, doc.summary)
      ),
      // Consequence
      doc.consequence && React.createElement('div', {
        style: { background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '18px 20px', marginBottom: 12 }
      },
        React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FF6B6B', marginBottom: 10 } }, 'Cost of Inaction'),
        React.createElement('p', { style: { fontSize: 14, color: C.offwhite, lineHeight: 1.7 } }, doc.consequence)
      ),
      // Recommendations
      React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 14 } },
        React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 12 } }, 'Recommended Actions'),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          doc.recs.map((r, i) => React.createElement('div', { key: i, style: { display: 'flex', gap: 12 } },
            React.createElement('div', { style: { width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.3)', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 } }, i + 1),
            React.createElement('p', { style: { fontSize: 14, color: C.offwhite, lineHeight: 1.6, flex: 1 } }, r)
          ))
        )
      ),
      React.createElement('button', {
        style: { display: 'flex', alignItems: 'center', gap: 7, background: C.gold, color: C.black, border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
      }, 'Schedule attorney consultation', React.createElement(Icon, { name: 'ArrowRight', size: 14, color: C.black }))
    )
  );
}

// ── Main Legal View ────────────────────────────────────────────────────────────
function LegalView() {
  const [selected, setSelected] = React.useState(null);
  if (selected) return React.createElement(LegalDocDetail, { doc: selected, onBack: () => setSelected(null) });

  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(LegalHero),
    React.createElement(CriticalAlert),
    React.createElement(AttorneyCard),
    React.createElement('div', { style: { padding: '24px 32px' } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 18 } }, 'Document Status'),
      legalGroups.map(g => React.createElement(LegalDocGroup, { key: g.id, group: g, onSelect: setSelected }))
    )
  );
}

Object.assign(window, { LegalView });
