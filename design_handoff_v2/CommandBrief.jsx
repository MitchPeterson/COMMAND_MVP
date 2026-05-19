// CommandBrief.jsx — Weekly Command Brief modal
// Executive briefing format: three sections (Risk, Leakage, Action)
// Triggered from notification bell in dashboard header.
// No consumer language — consequence-first, quantified, direct.

const briefSections = [
  {
    id: 'risk',
    tag: 'RISK',
    icon: 'AlertTriangle',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.15)',
    headline: '2 risks need action this week',
    summary: 'Your umbrella policy covers $1M against a $2.8M net worth — leaving $1.8M exposed. Your auto policy renews in 12 days with a 12% premium increase if not addressed.',
    context: 'A single liability judgment above your umbrella limit attaches directly to personal assets. The auto renewal window closes Feb 2 — missing it locks you into another year at the higher rate.',
  },
  {
    id: 'leakage',
    tag: 'LEAKAGE',
    icon: 'TrendingDown',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.06)',
    border: 'rgba(249,115,22,0.15)',
    headline: '$2,655 in recoverable savings identified',
    summary: '$875 in uncaptured 401(k) tax savings, $2,400 from harvestable investment losses, and an HSA contribution gap of $3,300.',
    context: 'These are based on your actual numbers — not estimates. The 401(k) and HSA gaps have hard year-end deadlines. Investment loss harvesting requires action before Dec 31 to offset 2025 gains.',
  },
  {
    id: 'action',
    tag: 'RECOMMENDED ACTION',
    icon: 'Zap',
    color: C.gold,
    bg: 'rgba(201,162,77,0.06)',
    border: 'rgba(201,162,77,0.2)',
    headline: 'Call your CPA before April 15',
    summary: 'With consulting income up $45K this year, your current withholding may result in an underpayment penalty. One call with Michael Chen can confirm your exposure.',
    context: 'The IRS underpayment penalty runs at 8% annualized. A $5K shortfall in estimated taxes creates ~$200 in avoidable penalties — and your Q1 payment is due April 15.',
  },
];

function CommandBrief({ onDismiss }) {
  const weekOf = 'Week of April 26, 2026';

  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
    },
    onClick: e => { if (e.target === e.currentTarget) onDismiss(); }
  },
    React.createElement('div', {
      style: {
        background: C.charcoal, border: `1px solid ${C.border}`,
        borderRadius: 12, width: '100%', maxWidth: 580,
        maxHeight: '88vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
      }
    },
      // Header
      React.createElement('div', {
        style: {
          padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }
      },
        React.createElement('div', null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
            React.createElement(HubMark, { size: 14 }),
            React.createElement('span', { style: { fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted } }, 'Weekly Command Brief')
          ),
          React.createElement('h2', { style: { fontSize: 18, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em' } }, weekOf),
          React.createElement('p', { style: { fontSize: 12, color: C.muted, marginTop: 3 } }, '3 items require your attention')
        ),
        React.createElement('button', {
          onClick: onDismiss,
          style: { background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }
        }, React.createElement(Icon, { name: 'X', size: 14, color: C.muted }))
      ),

      // Sections
      React.createElement('div', { style: { overflowY: 'auto', padding: '8px 0' } },
        briefSections.map((s, i) => React.createElement('div', {
          key: s.id,
          style: {
            padding: '18px 24px',
            borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
          }
        },
          // Tag row
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
            React.createElement('div', {
              style: { width: 24, height: 24, borderRadius: 6, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
            }, React.createElement(Icon, { name: s.icon, size: 12, color: s.color })),
            React.createElement('div', { style: { fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: s.color } }, s.tag)
          ),
          // Headline
          React.createElement('h3', { style: { fontSize: 15, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.01em', marginBottom: 8, lineHeight: 1.3 } }, s.headline),
          // Summary
          React.createElement('p', { style: { fontSize: 13, color: C.offwhite, lineHeight: 1.65, marginBottom: 10 } }, s.summary),
          // Context
          React.createElement('div', {
            style: { borderLeft: `2px solid ${C.border}`, paddingLeft: 12 }
          },
            React.createElement('p', { style: { fontSize: 11, color: C.muted, lineHeight: 1.65, fontStyle: 'italic' } }, s.context)
          )
        ))
      ),

      // Footer
      React.createElement('div', {
        style: { padding: '14px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }
      },
        React.createElement('span', { style: { fontSize: 11, color: C.muted } }, 'Updated daily · Based on your household data'),
        React.createElement('button', {
          onClick: onDismiss,
          style: { fontSize: 12, fontWeight: 600, color: C.muted, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', transition: 'color 150ms' }
        }, 'Dismiss for this week')
      )
    )
  );
}

Object.assign(window, { CommandBrief });
