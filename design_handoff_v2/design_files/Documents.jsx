// Documents.jsx — Command Documents vault
//
// Document storage organized by category with status indicators and version tracking.

const docs = [
  { id: 1,  name: 'Last Will and Testament',          cat: 'legal',     ext: 'PDF', date: 'Mar 15, 2019', status: 'needs-review', size: '2.4 MB', versions: 1 },
  { id: 2,  name: 'State Farm Auto Policy 2025',     cat: 'insurance', ext: 'PDF', date: 'Feb 1, 2025',  status: 'current',      size: '1.8 MB', versions: 3 },
  { id: 3,  name: 'Roof Warranty — GAF',              cat: 'home',      ext: 'PDF', date: 'Aug 25, 2022', status: 'current',      size: '856 KB', versions: 1 },
  { id: 4,  name: 'HVAC Installation Invoice',        cat: 'home',      ext: 'PDF', date: 'Jun 15, 2012', status: 'current',      size: '1.2 MB', versions: 1 },
  { id: 5,  name: '2024 Federal Tax Return',          cat: 'tax',       ext: 'PDF', date: 'Apr 12, 2025', status: 'current',      size: '4.1 MB', versions: 1 },
  { id: 6,  name: 'Healthcare Directive',             cat: 'legal',     ext: 'PDF', date: 'Mar 15, 2019', status: 'outdated',     size: '780 KB', versions: 1 },
  { id: 7,  name: 'Homeowners Insurance Declaration', cat: 'insurance', ext: 'PDF', date: 'Jun 15, 2025', status: 'current',      size: '2.1 MB', versions: 2 },
  { id: 8,  name: 'Property Tax Statement 2025',      cat: 'tax',       ext: 'PDF', date: 'Oct 2, 2025',  status: 'current',      size: '420 KB', versions: 1 },
  { id: 9,  name: 'Term Life Insurance Policy',       cat: 'insurance', ext: 'PDF', date: 'Dec 1, 2015',  status: 'current',      size: '3.2 MB', versions: 1 },
  { id: 10, name: 'Financial Power of Attorney',      cat: 'legal',     ext: 'PDF', date: 'Mar 15, 2019', status: 'needs-review', size: '610 KB', versions: 1 },
];

const docCats = [
  { id: 'all',       label: 'All',       count: docs.length },
  { id: 'legal',     label: 'Legal',     count: docs.filter(d => d.cat === 'legal').length },
  { id: 'insurance', label: 'Insurance', count: docs.filter(d => d.cat === 'insurance').length },
  { id: 'home',      label: 'Home',      count: docs.filter(d => d.cat === 'home').length },
  { id: 'tax',       label: 'Tax',       count: docs.filter(d => d.cat === 'tax').length },
];

const docStatusConfig = {
  current:        { color: '#22C55E', label: 'Current' },
  'needs-review': { color: '#EAB308', label: 'Needs Review' },
  outdated:       { color: '#F97316', label: 'Outdated' },
};

function DocumentsHero({ activeCat, onCat }) {
  return React.createElement('div', { style: { padding: '28px 32px 0', borderBottom: `1px solid ${C.border}` } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 } },
      React.createElement('div', null,
        React.createElement('div', { style: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 } }, 'Total Documents'),
        React.createElement('div', { style: { fontSize: 56, fontWeight: 700, color: C.offwhite, letterSpacing: '-0.03em', lineHeight: 1 } }, docs.length),
        React.createElement('div', { style: { fontSize: 13, color: C.muted, marginTop: 8 } }, `${docs.filter(d => d.status !== 'current').length} need attention`)
      ),
      React.createElement('button', {
        style: { display: 'flex', alignItems: 'center', gap: 7, background: C.gold, color: C.black, border: 'none', borderRadius: 7, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
      }, React.createElement(Icon, { name: 'Upload', size: 14, color: C.black }), 'Upload Document')
    ),
    React.createElement('div', { style: { display: 'flex', gap: 4 } },
      docCats.map(c => React.createElement('button', {
        key: c.id,
        onClick: () => onCat(c.id),
        style: { padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeCat === c.id ? C.gold : 'transparent'}`, color: activeCat === c.id ? C.offwhite : C.muted, fontSize: 13, fontWeight: activeCat === c.id ? 600 : 500, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif' }
      }, c.label, React.createElement('span', { style: { marginLeft: 6, fontSize: 11, color: C.dim } }, c.count)))
    )
  );
}

function DocumentList({ activeCat }) {
  const filtered = activeCat === 'all' ? docs : docs.filter(d => d.cat === activeCat);
  return React.createElement('div', { style: { padding: '24px 32px' } },
    React.createElement('div', { style: { background: C.charcoal, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' } },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '40px 2.5fr 1fr 1fr 110px 80px', gap: 16, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted } },
        React.createElement('div', null),
        React.createElement('div', null, 'Name'),
        React.createElement('div', null, 'Category'),
        React.createElement('div', null, 'Modified'),
        React.createElement('div', { style: { textAlign: 'center' } }, 'Status'),
        React.createElement('div', { style: { textAlign: 'right' } }, 'Size'),
      ),
      filtered.map((d, i) => {
        const cfg = docStatusConfig[d.status];
        return React.createElement('div', {
          key: d.id,
          style: { display: 'grid', gridTemplateColumns: '40px 2.5fr 1fr 1fr 110px 80px', gap: 16, padding: '12px 18px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 150ms' },
          onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)',
          onMouseLeave: e => e.currentTarget.style.background = 'transparent',
        },
          React.createElement('div', { style: { width: 28, height: 28, borderRadius: 5, background: 'rgba(201,162,77,0.1)', border: '1px solid rgba(201,162,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            React.createElement('span', { style: { fontSize: 9, fontWeight: 700, color: C.gold } }, d.ext)
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: 13, fontWeight: 500, color: C.offwhite } }, d.name),
            d.versions > 1 && React.createElement('div', { style: { fontSize: 10, color: C.dim, marginTop: 2 } }, `${d.versions} versions`)
          ),
          React.createElement('div', { style: { fontSize: 12, color: C.muted, textTransform: 'capitalize' } }, d.cat),
          React.createElement('div', { style: { fontSize: 12, color: C.muted, fontFamily: 'IBM Plex Mono, monospace' } }, d.date),
          React.createElement('div', { style: { textAlign: 'center' } },
            React.createElement('span', { style: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${cfg.color}1A`, color: cfg.color, border: `1px solid ${cfg.color}40`, whiteSpace: 'nowrap' } }, cfg.label)
          ),
          React.createElement('div', { style: { textAlign: 'right', fontSize: 11, color: C.muted, fontFamily: 'IBM Plex Mono, monospace' } }, d.size)
        );
      })
    )
  );
}

function DocumentsView() {
  const [activeCat, setActiveCat] = React.useState('all');
  return React.createElement('div', { style: { height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
    React.createElement(DocumentsHero, { activeCat, onCat: setActiveCat }),
    React.createElement(DocumentList, { activeCat })
  );
}

Object.assign(window, { DocumentsView });
