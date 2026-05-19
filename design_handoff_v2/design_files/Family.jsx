// Family.jsx — Command Family section
//
// Family members, milestones, college planning, aging parents.

const family = [
  { id: 1, name: 'Adam Bailey',     rel: 'Self',      age: 44, init: 'AB', next: '45th birthday — May 15, 2026' },
  { id: 2, name: 'Sarah Bailey',    rel: 'Spouse',    age: 42, init: 'SB', next: 'Annual health screening — Mar 2026' },
  { id: 3, name: 'Emma Bailey',     rel: 'Daughter',  age: 12, init: 'EB', next: 'Starting 7th grade — Sep 2026' },
  { id: 4, name: 'Jack Bailey',     rel: 'Son',       age: 9,  init: 'JB', next: 'Starting 4th grade — Sep 2026' },
];

const college = [
  { name: 'Emma Bailey', targetYear: 2031, cost: 200000, saved: 45000, monthly: 800 },
  { name: 'Jack Bailey', targetYear: 2034, cost: 220000, saved: 28000, monthly: 600 },
];

const milestones = [
  { id: 1, date: 'May 2026',  who: 'Adam',  event: 'Turns 45',                trigger: 'Life insurance review' },
  { id: 2, date: 'Sep 2026',  who: 'Emma',  event: 'Starts 7th grade',        trigger: 'Activity registrations' },
  { id: 3, date: 'Sep 2027',  who: 'Emma',  event: 'Starts high school',     trigger: 'College planning acceleration' },
  { id: 4, date: 'Sep 2029',  who: 'Emma',  event: 'Drivers license eligible', trigger: 'Auto insurance +$1,200/yr' },
  { id: 5, date: 'Aug 2031',  who: 'Emma',  event: 'Starts college',         trigger: '529 distributions begin' },
];

const agingParents = [
  { name: 'Robert Bailey',     rel: 'Father',       age: 72, location: 'Rochester, MN', health: 'Good' },
  { name: 'Linda Bailey',      rel: 'Mother',       age: 70, location: 'Rochester, MN', health: 'Good' },
  { name: 'Margaret Thompson', rel: 'Mother-in-law', age: 68, location: 'Minneapolis, MN', health: 'Fair' },
];

function FamilyHero() {
  return React.createElement('div', {
    style: { padding: '28px 32px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', gap: 48 }
  },
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Household'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, '4'),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, 'Members tracked')
    ),
    React.createElement('div', { style: { width: 1, height: 56, background: C.border } }),
    React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'College Funding'),
      React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: '#22C55E', letterSpacing: '-0.03em', lineHeight: 1 } }, 'On Track'),
      React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, '$73K saved · 2 children')
    )
  );
}

function FamilyMembers() {
  return React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Members'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      family.map(m => React.createElement('div', {
        key: m.id,
        style: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8 }
      },
        React.createElement('div', { style: { width: 38, height: 38, borderRadius: '50%', background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.25)', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 } }, m.init),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite } }, m.name),
          React.createElement('div', { style: { fontSize: 12, color: C.muted, marginTop: 2 } }, `${m.rel} · ${m.age}`),
          React.createElement('div', { style: { fontSize: 11, color: C.gold, marginTop: 4 } }, m.next)
        )
      ))
    )
  );
}

function CollegeCards() {
  return React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'College Funding'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
      college.map(c => {
        const pct = (c.saved / c.cost) * 100;
        const yearsLeft = c.targetYear - 2026;
        return React.createElement('div', {
          key: c.name,
          style: { padding: '18px 20px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10 }
        },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 } },
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite } }, c.name),
              React.createElement('div', { style: { fontSize: 11, color: C.muted, marginTop: 2 } }, `Target: ${c.targetYear} · ${yearsLeft} years away`)
            ),
            React.createElement('span', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#22C55E', textTransform: 'uppercase' } }, 'On Track')
          ),
          React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 } },
            React.createElement('span', { style: { fontSize: 24, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.02em', fontFamily: 'IBM Plex Mono, monospace' } }, `$${(c.saved/1000).toFixed(0)}K`),
            React.createElement('span', { style: { fontSize: 13, color: C.muted } }, `of $${(c.cost/1000).toFixed(0)}K target`)
          ),
          React.createElement('div', { style: { height: 6, background: C.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 } },
            React.createElement('div', { style: { width: `${pct}%`, height: '100%', background: '#22C55E' } })
          ),
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted } },
            React.createElement('span', null, `$${c.monthly}/mo contribution`),
            React.createElement('span', null, `${pct.toFixed(0)}% funded`)
          )
        );
      })
    )
  );
}

function FamilyMilestones() {
  return React.createElement('div', { style: { padding: '24px 32px', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Upcoming Milestones'),
    React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' } },
      milestones.map((m, i) => React.createElement('div', {
        key: m.id,
        style: { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }
      },
        React.createElement('div', { style: { fontSize: 12, color: C.gold, fontFamily: 'IBM Plex Mono, monospace', minWidth: 80 } }, m.date),
        React.createElement('div', { style: { fontSize: 11, fontWeight: 600, color: C.muted, minWidth: 50 } }, m.who),
        React.createElement('div', { style: { fontSize: 13, fontWeight: 500, color: C.offwhite, flex: 1 } }, m.event),
        React.createElement('div', { style: { fontSize: 11, color: C.muted } }, `→ ${m.trigger}`)
      ))
    )
  );
}

function AgingParents() {
  return React.createElement('div', { style: { padding: '24px 32px' } },
    React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 } }, 'Aging Parents'),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      agingParents.map((p, i) => React.createElement('div', {
        key: i,
        style: { display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 8 }
      },
        React.createElement('div', { style: { flex: 1 } },
          React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: C.offwhite } }, p.name),
          React.createElement('div', { style: { fontSize: 12, color: C.muted, marginTop: 2 } }, `${p.rel} · ${p.age} · ${p.location}`)
        ),
        React.createElement('span', { style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: p.health === 'Good' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', color: p.health === 'Good' ? '#22C55E' : '#EAB308', border: `1px solid ${p.health === 'Good' ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}` } }, p.health)
      ))
    )
  );
}

function FamilyView() {
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(FamilyHero),
    React.createElement(FamilyMembers),
    React.createElement(CollegeCards),
    React.createElement(FamilyMilestones),
    React.createElement(AgingParents)
  );
}

Object.assign(window, { FamilyView });
