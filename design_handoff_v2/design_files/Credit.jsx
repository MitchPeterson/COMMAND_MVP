// Credit.jsx — Command Credit & Rewards
//
// Credit cards with rewards balances, spending optimization, recommendations.

const cards = [
  { id: 1, name: 'Sapphire Reserve',    issuer: 'Chase',  type: 'travel',    fee: 550, limit: 34000, balance: 2847, pts: 145000, ptsType: 'Ultimate Rewards', best: 'Travel · Dining' },
  { id: 2, name: 'Freedom Unlimited',   issuer: 'Chase',  type: 'cashback',  fee: 0,   limit: 18000, balance: 1250, pts: 12500,  ptsType: 'Ultimate Rewards', best: 'Everyday spending' },
  { id: 3, name: 'Blue Cash Preferred', issuer: 'Amex',   type: 'cashback',  fee: 95,  limit: 25000, balance: 890,  pts: 342,    ptsType: 'Cash back ($)',    best: 'Groceries · Gas' },
  { id: 4, name: 'Ink Business',        issuer: 'Chase',  type: 'business',  fee: 95,  limit: 20000, balance: 0,    pts: 48000,  ptsType: 'Ultimate Rewards', best: 'Business expenses' },
];

const spending = [
  { cat: 'Groceries',      monthly: 1200, currentCard: 'Blue Cash',      bestCard: 'Blue Cash',        optimized: true,  potential: 72,   actual: 72 },
  { cat: 'Dining',         monthly: 600,  currentCard: 'Sapphire',       bestCard: 'Sapphire',         optimized: true,  potential: 54,   actual: 54 },
  { cat: 'Gas',            monthly: 350,  currentCard: 'Freedom',        bestCard: 'Blue Cash',        optimized: false, potential: 21,   actual: 5.25 },
  { cat: 'Travel',         monthly: 400,  currentCard: 'Sapphire',       bestCard: 'Sapphire',         optimized: true,  potential: 36,   actual: 36 },
  { cat: 'Online Shopping', monthly: 800, currentCard: 'Various',        bestCard: 'Freedom',          optimized: false, potential: 12,   actual: 8 },
  { cat: 'Subscriptions',   monthly: 250, currentCard: 'Sapphire',       bestCard: 'Blue Cash',        optimized: false, potential: 15,   actual: 2.50 },
];

const totalRewards = cards.reduce((s, c) => s + (c.ptsType === 'Cash back ($)' ? c.pts : c.pts * 0.0175), 0);
const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
const totalBalance = cards.reduce((s, c) => s + c.balance, 0);
const utilization = (totalBalance / totalLimit) * 100;
const monthlyLeakage = spending.reduce((s, p) => s + (p.potential - p.actual), 0);

function CreditHero() {
  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', gap: 48 }
  },
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Rewards Value'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: C.gold, letterSpacing: '-0.03em', lineHeight: 1 } }, `$${(totalRewards/1000).toFixed(1)}K`),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, `Across ${cards.length} cards`)
    ),
    React.createElement('div', { style: { width: 1, height: 56, background: C.border } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Utilization'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: '#22C55E', letterSpacing: '-0.03em', lineHeight: 1 } }, `${utilization.toFixed(0)}%`),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, `$${totalBalance.toLocaleString()} of $${(totalLimit/1000).toFixed(0)}K`)
    ),
    React.createElement('div', { style: { flex: 1 } }),
    React.createElement('div', { style: { textAlign: 'right' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 8 } },
        React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#EAB308' } }),
        React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: '#EAB308' } }, `$${monthlyLeakage.toFixed(0)}/mo unoptimized`),
      )
    )
  );
}

function CreditCardsList() {
  return React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Cards'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      cards.map(c => React.createElement('div', {
        key: c.id,
        style: { padding: '18px 20px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10 }
      },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 } }, c.issuer),
            React.createElement('div', { style: { fontSize: 15, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.005em' } }, c.name)
          ),
          c.fee > 0 && React.createElement('span', { style: { fontSize: 10, color: C.muted } }, `$${c.fee}/yr`)
        ),
        React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: C.gold, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.01em', marginBottom: 3 } },
          c.ptsType === 'Cash back ($)' ? `$${c.pts.toFixed(0)}` : `${(c.pts/1000).toFixed(0)}K pts`
        ),
        React.createElement('div', { style: { fontSize: 11, color: C.muted, marginBottom: 12 } }, c.ptsType),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, paddingTop: 12, borderTop: `1px solid ${C.border}` } },
          React.createElement('span', null, `$${c.balance.toLocaleString()} / $${(c.limit/1000).toFixed(0)}K`),
          React.createElement('span', { style: { color: C.gold } }, c.best)
        )
      ))
    )
  );
}

function SpendingOptimization() {
  return React.createElement('div', { style: { padding: '24px 32px' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted } }, 'Spending Optimization'),
      React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: '#22C55E' } }, `+$${monthlyLeakage.toFixed(0)}/mo recoverable`)
    ),
    React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 80px', gap: 16, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted } },
        React.createElement('div', null, 'Category'),
        React.createElement('div', { style: { textAlign: 'right' } }, 'Monthly'),
        React.createElement('div', null, 'Current'),
        React.createElement('div', null, 'Best Card'),
        React.createElement('div', { style: { textAlign: 'right' } }, 'Δ'),
      ),
      spending.map((s, i) => {
        const delta = s.potential - s.actual;
        return React.createElement('div', {
          key: s.cat,
          style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 80px', gap: 16, padding: '12px 18px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }
        },
          React.createElement('div', { style: { fontSize: 13, fontWeight: 500, color: C.offwhite } }, s.cat),
          React.createElement('div', { style: { textAlign: 'right', fontSize: 13, color: C.muted, fontFamily: 'IBM Plex Mono, monospace' } }, `$${s.monthly.toLocaleString()}`),
          React.createElement('div', { style: { fontSize: 12, color: s.optimized ? '#22C55E' : C.muted } }, s.currentCard),
          React.createElement('div', { style: { fontSize: 12, color: s.optimized ? C.muted : C.gold, fontWeight: s.optimized ? 400 : 600 } }, s.bestCard),
          React.createElement('div', { style: { textAlign: 'right', fontSize: 12, fontWeight: 600, color: delta > 0 ? '#EAB308' : C.muted, fontFamily: 'IBM Plex Mono, monospace' } }, delta > 0 ? `+$${delta.toFixed(0)}` : '—')
        );
      })
    )
  );
}

function CreditView() {
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(CreditHero),
    React.createElement(CreditCardsList),
    React.createElement(SpendingOptimization)
  );
}

Object.assign(window, { CreditView });
