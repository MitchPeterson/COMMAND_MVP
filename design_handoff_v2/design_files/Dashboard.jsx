// Dashboard.jsx v2 — Command Dashboard
//
// Design rationale:
// Three-tier visual hierarchy: (1) Health Score dominates — large typographic
// number treatment, not a ring. Size and weight do the work. (2) Section Status
// is a ranked vertical list, sorted worst→best, so critical items surface
// immediately without scanning. Gold left-border accent on at-risk sections
// adds urgency without color overuse. (3) Priority Actions and Timeline occupy
// the right column as supporting context — available but not competing.
//
// Priority Actions are grouped by severity (Critical / High / Review) and
// written consequence-first: the user learns the cost of inaction before the
// recommended action. No checkboxes, no gamification, no completion states.
//
// The header lives inside this component per brief: COMMAND wordmark (gold),
// greeting, date, notification button. No hamburger, no tabs — navigation
// is exclusively in the sidebar.
//
// Gold is used at maximum 20% of the visual surface: score accent, left borders
// on critical sections, wordmark, CTA elements only.

const priorities = [
  { id: 1, icon: 'FileText', title: 'Update Estate Documents', category: 'Legal', impact: 'Critical', urgency: 'Overdue — 6 years since last review',
    consequence: 'With $2.8M in assets, dying without a trust costs your estate $15,000–$40,000 in avoidable probate and delays distribution by 12–18 months.',
    action: 'Schedule attorney review' },
  { id: 2, icon: 'Shield', title: 'Auto Insurance Renewal', category: 'Insurance', impact: 'High', urgency: 'Due in 12 days — Feb 2',
    consequence: 'Auto-renewal locks in a 12% premium increase. Current market shows $450/year savings available with identical coverage.',
    action: 'Compare quotes now' },
  { id: 3, icon: 'Umbrella', title: 'Umbrella Coverage Gap', category: 'Insurance', impact: 'High', urgency: 'Review this quarter',
    consequence: 'Your $1M umbrella covers 36% of net worth. A single liability judgment above that limit exposes personal assets directly.',
    action: 'Review coverage limit' },
  { id: 4, icon: 'Thermometer', title: 'HVAC Replacement Planning', category: 'Home', impact: 'Medium', urgency: 'Plan within 18 months',
    consequence: 'System is 14 years old. Emergency replacement costs 30% more than planned. Budget $8,500 now to avoid financing at peak season.',
    action: 'Start replacement fund' },
];

const sectionScores = [
  { id: 'legal',     icon: 'FileText',   label: 'Legal',    score: 4.0, statusLabel: '3 actions needed',  status: 'bad'  },
  { id: 'insurance', icon: 'Shield',     label: 'Insurance',score: 6.5, statusLabel: '2 actions needed',  status: 'warn' },
  { id: 'credit',    icon: 'CreditCard', label: 'Credit',   score: 7.0, statusLabel: 'Review suggested',  status: 'warn' },
  { id: 'home',      icon: 'Home',       label: 'Home',     score: 7.5, statusLabel: 'Monitor HVAC',      status: 'warn' },
  { id: 'taxes',     icon: 'Receipt',    label: 'Taxes',    score: 7.5, statusLabel: 'Q1 payment due',    status: 'warn' },
  { id: 'finances',  icon: 'Wallet',     label: 'Finances', score: 8.0, statusLabel: 'On track',          status: 'good' },
  { id: 'family',    icon: 'Users',      label: 'Family',   score: 8.5, statusLabel: 'Up to date',        status: 'good' },
];

const timelineEvents = [
  { id: 1, date: 'Feb 2',  title: 'Auto Insurance Renewal', category: 'Insurance', urgent: true },
  { id: 2, date: 'Feb 15', title: 'Q1 Estimated Tax Payment', category: 'Taxes', urgent: false },
  { id: 3, date: 'Mar 1',  title: 'Home Insurance Renewal', category: 'Insurance', urgent: false },
  { id: 4, date: 'Apr 15', title: 'Federal Tax Filing Deadline', category: 'Taxes', urgent: true },
  { id: 5, date: 'May 15', title: 'Adam turns 45 — estate review trigger', category: 'Legal', urgent: false },
];

const scoreColor = s => s === 'good' ? '#22C55E' : s === 'warn' ? '#C9A24D' : '#EF4444';
const impactConfig = {
  Critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'CRITICAL' },
  High:     { color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', label: 'HIGH' },
  Medium:   { color: '#808084', bg: 'rgba(128,128,132,0.08)', border: 'rgba(128,128,132,0.15)', label: 'REVIEW' },
};

const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

// ── Health Score Hero ──────────────────────────────────────────────────────────
function HealthScoreHero() {
  const score = 72;
  const statusLabel = 'NEEDS ATTENTION';
  const insight = '3 items require action this week';

  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}` }
  },
    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Household Health Score'),
        React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 18 } },
          React.createElement('span', { style: { fontSize: 80, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.04em', lineHeight: 1 } }, score),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.gold, marginBottom: 6 } }, statusLabel),
            React.createElement('div', { style: { fontSize: 14, color: C.muted } }, insight)
          )
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: 3, alignItems: 'flex-end', paddingBottom: 8 } },
        [20,40,50,60,65,70,72,80,90,100].map((threshold, i) => {
          const filled = score >= threshold;
          return React.createElement('div', { key: i, style: { width: 5, height: 8 + (i * 2.5), background: filled ? (score < 60 ? '#EF4444' : score < 75 ? C.gold : '#22C55E') : C.border, borderRadius: 2 } });
        })
      )
    )
  );
}

// ── Section Status List ────────────────────────────────────────────────────────
function SectionStatusList({ onNav }) {
  return React.createElement('div', { style: { padding: '20px 32px' } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Section Status'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 1 } },
      sectionScores.map(s => {
        const color = scoreColor(s.status);
        const isAt = s.status === 'bad';
        const isWarn = s.status === 'warn';
        return React.createElement('div', {
          key: s.id,
          onClick: () => onNav(s.id),
          style: {
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px 11px 12px', borderRadius: 8,
            background: isAt ? 'rgba(239,68,68,0.06)' : 'transparent',
            borderLeft: `3px solid ${isAt ? '#EF4444' : isWarn ? 'rgba(201,162,77,0.4)' : 'transparent'}`,
            cursor: 'pointer', transition: 'background 150ms',
          },
          onMouseEnter: e => e.currentTarget.style.background = isAt ? 'rgba(239,68,68,0.09)' : 'rgba(255,255,255,0.04)',
          onMouseLeave: e => e.currentTarget.style.background = isAt ? 'rgba(239,68,68,0.06)' : 'transparent',
        },
          React.createElement(Icon, { name: s.icon, size: 15, color: isAt ? '#EF4444' : C.muted }),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { fontSize: 14, fontWeight: isAt ? 600 : 500, color: C.offwhite } }, s.label)
          ),
          React.createElement('div', { style: { fontSize: 12, color: isAt ? '#FF6B6B' : C.muted, marginRight: 14, whiteSpace: 'nowrap' } }, s.statusLabel),
          React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color, letterSpacing: '-0.01em', width: 36, textAlign: 'right', flexShrink: 0 } }, s.score.toFixed(1))
        );
      })
    )
  );
}

// ── Priority Actions Panel ─────────────────────────────────────────────────────
function PriorityPanel({ onSelectPriority }) {
  const grouped = {
    Critical: priorities.filter(p => p.impact === 'Critical'),
    High:     priorities.filter(p => p.impact === 'High'),
    Medium:   priorities.filter(p => p.impact === 'Medium'),
  };

  return React.createElement('div', { style: { padding: '20px 24px', borderBottom: `1px solid ${C.border}`, flex: 1 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted } }, 'Priority Actions'),
      React.createElement('span', { style: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#FF6B6B', border: '1px solid rgba(239,68,68,0.25)' } }, `${priorities.length} open`)
    ),
    Object.entries(grouped).map(([impact, items]) => {
      if (!items.length) return null;
      const cfg = impactConfig[impact];
      return React.createElement('div', { key: impact, style: { marginBottom: 16 } },
        React.createElement('div', {
          style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: cfg.color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }
        },
          React.createElement('div', { style: { width: 20, height: 1, background: cfg.color } }),
          cfg.label,
          React.createElement('div', { style: { flex: 1, height: 1, background: C.border } })
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          items.map(p => React.createElement('div', {
            key: p.id,
            onClick: () => onSelectPriority(p),
            style: {
              padding: '14px 16px', borderRadius: 8,
              background: C.charcoal, border: `1px solid ${C.border}`,
              cursor: 'pointer', transition: 'border-color 150ms',
            },
            onMouseEnter: e => e.currentTarget.style.borderColor = '#484950',
            onMouseLeave: e => e.currentTarget.style.borderColor = C.border,
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12 } },
              React.createElement('div', { style: { width: 28, height: 28, borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
                React.createElement(Icon, { name: p.icon, size: 13, color: cfg.color })
              ),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite, marginBottom: 5, letterSpacing: '-0.005em' } }, p.title),
                React.createElement('div', { style: { fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 10 } }, p.consequence),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                  React.createElement('span', { style: { fontSize: 11, color: C.dim } }, p.urgency),
                  React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: C.gold } }, `${p.action} →`)
                )
              )
            )
          ))
        )
      );
    })
  );
}

// ── Timeline Strip ─────────────────────────────────────────────────────────────
function TimelineStrip() {
  return React.createElement('div', { style: { padding: '16px 24px' } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Upcoming — 90 Days'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
      timelineEvents.map((e, i) => React.createElement('div', {
        key: e.id,
        style: { display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }
      },
        React.createElement('div', {
          style: { fontSize: 12, fontWeight: 600, color: e.urgent ? C.gold : C.muted, width: 48, flexShrink: 0, fontFamily: 'IBM Plex Mono, monospace' }
        }, e.date),
        React.createElement('div', { style: { flex: 1, fontSize: 13, color: e.urgent ? C.offwhite : C.muted, fontWeight: e.urgent ? 500 : 400 } }, e.title),
        React.createElement('div', { style: { fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: C.dim, textTransform: 'uppercase', whiteSpace: 'nowrap' } }, e.category)
      ))
    )
  );
}

// ── Priority Detail ────────────────────────────────────────────────────────────
function PriorityDetail({ p, onBack }) {
  const cfg = impactConfig[p.impact] || impactConfig.Medium;
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', padding: '28px 32px' } },
    React.createElement('button', {
      onClick: onBack,
      style: { display: 'flex', alignItems: 'center', gap: 6, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, marginBottom: 28, fontFamily: 'IBM Plex Sans, sans-serif' }
    }, React.createElement(Icon, { name: 'ChevronLeft', size: 16, color: C.muted }), 'Dashboard'),
    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 } },
      React.createElement('div', { style: { width: 42, height: 42, borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
        React.createElement(Icon, { name: p.icon, size: 18, color: cfg.color })
      ),
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: cfg.color, marginBottom: 5 } }, p.impact),
        React.createElement('h1', { style: { fontSize: 20, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em', lineHeight: 1.2 } }, p.title),
        React.createElement('div', { style: { fontSize: 12, color: C.muted, marginTop: 4 } }, p.urgency)
      )
    ),
    React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px', marginBottom: 12 } },
      React.createElement('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 } }, 'Cost of inaction'),
      React.createElement('p', { style: { fontSize: 14, color: C.offwhite, lineHeight: 1.7 } }, p.consequence)
    ),
    React.createElement('button', {
      style: { display: 'flex', alignItems: 'center', gap: 8, background: C.gold, color: C.black, border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
    }, p.action, React.createElement(Icon, { name: 'ArrowRight', size: 14, color: C.black }))
  );
}

// ── Dashboard View ─────────────────────────────────────────────────────────────
function DashboardView({ onNav }) {
  const [selectedPriority, setSelectedPriority] = React.useState(null);
  const [showBrief, setShowBrief] = React.useState(false);
  if (selectedPriority) return React.createElement(PriorityDetail, { p: selectedPriority, onBack: () => setSelectedPriority(null) });

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } },
    showBrief && React.createElement(CommandBrief, { onDismiss: () => setShowBrief(false) }),

    // App header
    React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 58, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0, background: C.charcoal,
      }
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        React.createElement(HubMark, { size: 18 }),
        React.createElement('div', { style: { width: 1, height: 18, background: C.border } }),
        React.createElement('span', { style: { fontSize: 13, color: C.muted } }, 'Good morning, '),
        React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: C.offwhite } }, 'Adam')
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
        React.createElement('div', { style: { fontSize: 12, color: C.muted } }, today),
        React.createElement('div', { style: { width: 1, height: 16, background: C.border } }),
        React.createElement('button', {
          onClick: () => setShowBrief(true),
          style: { background: 'rgba(201,162,77,0.1)', border: `1px solid rgba(201,162,77,0.3)`, cursor: 'pointer', padding: '7px 14px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 7, position: 'relative', transition: 'background 150ms' },
          onMouseEnter: e => e.currentTarget.style.background = 'rgba(201,162,77,0.18)',
          onMouseLeave: e => e.currentTarget.style.background = 'rgba(201,162,77,0.1)',
        },
          React.createElement(Icon, { name: 'Bell', size: 14, color: C.gold }),
          React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: C.gold } }, 'Weekly Brief'),
          React.createElement('div', { style: { position: 'absolute', top: -4, right: -4, width: 9, height: 9, borderRadius: '50%', background: '#EF4444', border: `2px solid ${C.charcoal}` } })
        )
      )
    ),

    // Main content
    React.createElement('div', { style: { flex: 1, display: 'flex', overflow: 'hidden' } },

      // Left column
      React.createElement('div', { style: { flex: '1.4', borderRight: `1px solid ${C.border}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
        React.createElement(HealthScoreHero),
        React.createElement(SectionStatusList, { onNav })
      ),

      // Right column
      React.createElement('div', { style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
        React.createElement(PriorityPanel, { onSelectPriority: setSelectedPriority }),
        React.createElement(TimelineStrip)
      )
    )
  );
}

Object.assign(window, { DashboardView });
