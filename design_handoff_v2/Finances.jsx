// Finances.jsx — Command Finances section
//
// Budget tracking, savings rate, and upcoming financial obligations.
// Hero shows monthly net (income - actual spend) and savings rate.
// Budget table is the centerpiece with over/under highlighted.

const budget = [
  { cat: 'Housing',        icon: 'Home',          budgeted: 3500, actual: 3450 },
  { cat: 'Savings',        icon: 'PiggyBank',     budgeted: 3000, actual: 3000 },
  { cat: 'Groceries',      icon: 'ShoppingCart',  budgeted: 1200, actual: 1180 },
  { cat: 'Transportation', icon: 'Car',           budgeted: 800,  actual: 920 },
  { cat: 'Dining',         icon: 'Utensils',      budgeted: 600,  actual: 720 },
  { cat: 'Insurance',      icon: 'Shield',        budgeted: 650,  actual: 650 },
  { cat: 'Entertainment',  icon: 'Tv',            budgeted: 400,  actual: 480 },
  { cat: 'Utilities',      icon: 'Zap',           budgeted: 400,  actual: 385 },
  { cat: 'Healthcare',     icon: 'Heart',         budgeted: 300,  actual: 275 },
  { cat: 'Other',          icon: 'DollarSign',    budgeted: 500,  actual: 540 },
];

const obligations = [
  { id: 1, desc: 'Q1 Estimated Tax Payment',     amount: 12500, due: 'Apr 15, 2026', urgent: true },
  { id: 2, desc: 'Property Tax (1st half)',      amount: 4100,  due: 'May 15, 2026', urgent: false },
  { id: 3, desc: 'Emma Summer Camp Deposit',     amount: 1500,  due: 'Mar 1, 2026',  urgent: true },
  { id: 4, desc: 'Annual Life Insurance Premium', amount: 1020, due: 'Dec 1, 2026',  urgent: false },
  { id: 5, desc: 'Car Registration Renewal',     amount: 450,   due: 'Jun 30, 2026', urgent: false },
];

const monthlyIncome = 27083;
const totalBudgeted = budget.reduce((s, b) => s + b.budgeted, 0);
const totalActual = budget.reduce((s, b) => s + b.actual, 0);
const savingsRate = Math.round((budget.find(b => b.cat === 'Savings').actual / monthlyIncome) * 100);

function FinancesHero() {
  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', gap: 48 }
  },
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Monthly Income'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, `$${(monthlyIncome/1000).toFixed(1)}K`),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, '$325K annual gross')
    ),
    React.createElement('div', { style: { width: 1, height: 56, background: C.border } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Savings Rate'),
      React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
        React.createElement('span', { style: { fontSize: 56, fontWeight: 700, color: '#22C55E', letterSpacing: '-0.03em', lineHeight: 1 } }, `${savingsRate}%`),
      ),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, '$3,000/mo to investments')
    ),
    React.createElement('div', { style: { flex: 1 } }),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: '#EAB308' } }),
        React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: '#EAB308' } }, `$${(totalActual - totalBudgeted).toLocaleString()} over budget`),
      ),
      React.createElement('button', {
        style: { display: 'flex', alignItems: 'center', gap: 7, background: C.gold, color: C.black, border: 'none', borderRadius: 7, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
      }, React.createElement(Icon, { name: 'Plus', size: 14, color: C.black }), 'Add Transaction')
    )
  );
}

function BudgetTable() {
  return React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'February Budget'),
    React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' } },
      // Header
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 80px', gap: 16, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted } },
        React.createElement('div', null, 'Category'),
        React.createElement('div', { style: { textAlign: 'right' } }, 'Budgeted'),
        React.createElement('div', { style: { textAlign: 'right' } }, 'Actual'),
        React.createElement('div', null, 'Usage'),
        React.createElement('div', { style: { textAlign: 'right' } }, 'Δ'),
      ),
      // Rows
      budget.map((b, i) => {
        const delta = b.actual - b.budgeted;
        const pct = (b.actual / b.budgeted) * 100;
        const isOver = pct > 100;
        const barColor = pct > 110 ? '#EF4444' : pct > 100 ? '#EAB308' : pct > 85 ? C.gold : '#22C55E';
        return React.createElement('div', {
          key: b.cat,
          style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 80px', gap: 16, padding: '12px 18px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }
        },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            React.createElement(Icon, { name: b.icon, size: 14, color: C.muted }),
            React.createElement('span', { style: { fontSize: 13, fontWeight: 500, color: C.offwhite } }, b.cat)
          ),
          React.createElement('div', { style: { textAlign: 'right', fontSize: 13, color: C.muted, fontFamily: 'IBM Plex Mono, monospace' } }, `$${b.budgeted.toLocaleString()}`),
          React.createElement('div', { style: { textAlign: 'right', fontSize: 13, fontWeight: 600, color: C.offwhite, fontFamily: 'IBM Plex Mono, monospace' } }, `$${b.actual.toLocaleString()}`),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            React.createElement('div', { style: { flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' } },
              React.createElement('div', { style: { width: `${Math.min(100, pct)}%`, height: '100%', background: barColor } })
            ),
            React.createElement('span', { style: { fontSize: 11, color: C.muted, fontFamily: 'IBM Plex Mono, monospace', minWidth: 36, textAlign: 'right' } }, `${pct.toFixed(0)}%`)
          ),
          React.createElement('div', { style: { textAlign: 'right', fontSize: 12, fontWeight: 600, color: delta > 0 ? '#FF6B6B' : delta < 0 ? '#22C55E' : C.muted, fontFamily: 'IBM Plex Mono, monospace' } }, `${delta > 0 ? '+' : ''}${delta === 0 ? '—' : '$' + Math.abs(delta).toLocaleString()}`),
        );
      })
    )
  );
}

function ObligationsList() {
  return React.createElement('div', { style: { padding: '24px 32px' } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Upcoming Obligations'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      obligations.map(o => React.createElement('div', {
        key: o.id,
        style: { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8, borderLeft: o.urgent ? `3px solid ${C.gold}` : `1px solid ${C.border}` }
      },
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite } }, o.desc),
          React.createElement('div', { style: { fontSize: 12, color: o.urgent ? C.gold : C.muted, marginTop: 3, fontFamily: 'IBM Plex Mono, monospace' } }, `Due ${o.due}`)
        ),
        React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: C.offwhite, fontFamily: 'IBM Plex Mono, monospace' } }, `$${o.amount.toLocaleString()}`)
      ))
    )
  );
}

function FinancesView() {
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(FinancesHero),
    React.createElement(BudgetTable),
    React.createElement(ObligationsList)
  );
}

Object.assign(window, { FinancesView });
