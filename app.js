/* Causal Designs — a wiki of identification designs with examples from the papers of the causal atlas.
   Static: reads data/designs.json (built by pipeline/build_designs.py). Routes:
   #/  #/family/<id>  #/design/<id>  #/pattern/<id>  #/source/<id>  #/sources  #/paper/<artid>  #/papers  #/graph  #/about
   Every route accepts ?corpus=<id>; the filter sticks while browsing (the atlas links here with its own corpus). */
'use strict';
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nice = s => String(s || '').replace(/_/g, ' ');
const ARROW = '→';
let D, SEARCH;
const FAM = {}, SUB = {}, PAT = {}, SRC = {}, UNIT = {}, PAPER = {}, GNODE = {};
const S = { corpus: '' };
const PALETTE = ['#1a4f8a', '#17795e', '#a8621a', '#6b3fa0', '#2a7f9e', '#7a6a1a', '#b5485d', '#555', '#3b6e3b', '#8a4a1a', '#1a6a8a', '#7a3a6a', '#5a5a1a', '#1a4a4a', '#8a1a3a', '#333'];
const FAMCOL = {}, KINDCOL = {};

/* ================= load ================= */
(async function init() {
  try {
    D = await fetch('data/designs.json').then(r => { if (!r.ok) throw new Error('data/designs.json ' + r.status); return r.json(); });
  } catch (err) {
    $('#app').innerHTML = '<div class="wrap"><p class="empty">The designs data did not load (' + esc(err.message) +
      '). Build it with <code>python pipeline/build_designs.py</code> and serve the designs folder.</p></div>';
    throw err;
  }
  D.families.forEach((f, i) => { FAM[f.id] = f; FAMCOL[f.id] = PALETTE[i % PALETTE.length]; });
  D.sub_designs.forEach(s => SUB[s.id] = s);
  D.patterns.forEach(p => PAT[p.id] = p);
  D.sources.forEach(s => SRC[s.id] = s);
  D.units.forEach(u => UNIT[u.id] = u);
  D.papers.forEach(p => PAPER[p.artid] = p);
  D.graph.nodes.forEach(n => GNODE[n.id] = n);
  (D.meta.source_kinds || []).forEach((k, i) => KINDCOL[k] = PALETTE[(i + 2) % PALETTE.length]);
  KINDCOL.none = '#c9c7bb';
  SEARCH = new MiniSearch({ fields: ['label', 'definition', 'kind', 'text'], storeFields: ['path', 'kind', 'label'],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { label: 3 } } });
  const doc = (kind, path, label, definition, text) => ({ id: kind + ':' + path + ':' + (label || ''), path: path, kind: kind, label: label || '', definition: definition || '', text: text || '' });
  const docs = [].concat(
    D.families.map(f => doc('family', 'family/' + f.id, f.label, f.definition, '')),
    D.sub_designs.map(s => doc('sub-design', 'design/' + s.id, s.label, s.definition, nice(s.family))),
    D.patterns.map(p => doc('pattern', 'pattern/' + p.id, p.label, p.definition, '')),
    D.sources.map(s => doc('source of variation', 'source/' + s.id, s.label, nice(s.kind), '')),
    D.papers.map(p => doc('paper', 'paper/' + p.artid, p.title || p.artid, (p.authors || []).join(', ') + ' ' + (p.year || ''), p.journal || '')),
    D.units.map(u => doc('example', 'paper/' + u.artid, (u.treatment || '') + ' ' + ARROW + ' ' + (u.outcome || ''), u.summary || '', nice(u.family) + ' ' + u.id)));
  const seen = new Set();
  SEARCH.addAll(docs.filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return true; }));
  window.addEventListener('hashchange', route);
  route();
})();

/* ================= router ================= */
function parseHash() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  const seg = path.split('/').filter(Boolean);
  const q = {};
  (qs || '').split('&').forEach(kv => { if (!kv) return; const i = kv.indexOf('='); const k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
    try { q[decodeURIComponent(k)] = decodeURIComponent(v); } catch (e) { q[k] = v; } });
  let arg = seg.slice(1).join('/'); try { arg = decodeURIComponent(arg); } catch (e) { /* keep */ }
  return { head: seg[0] || 'home', arg: arg, q: q };
}
function href(path, q) {
  q = Object.assign({}, q || {}); if (S.corpus && q.corpus === undefined) q.corpus = S.corpus;
  const qs = Object.entries(q).filter(([, v]) => v != null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  return '#/' + path + (qs ? '?' + qs : '');
}
const A = (path, text, cls, q) => '<a href="' + href(path, q) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</a>';
function route() {
  const r = parseHash();
  if (r.q.corpus !== undefined) S.corpus = r.q.corpus;
  document.querySelectorAll('nav .links a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === r.head ||
    (a.dataset.r === 'home' && ['family', 'design', 'pattern'].indexOf(r.head) >= 0) || (a.dataset.r === 'papers' && r.head === 'paper') || (a.dataset.r === 'sources' && r.head === 'source')));
  window.scrollTo(0, 0);
  const app = $('#app'); app.innerHTML = '';
  if (r.head === 'family') return viewFamily(app, r.arg);
  if (r.head === 'design') return viewDesign(app, r.arg);
  if (r.head === 'pattern') return viewPattern(app, r.arg);
  if (r.head === 'source') return viewSource(app, r.arg);
  if (r.head === 'sources') return viewSources(app);
  if (r.head === 'paper') return viewPaper(app, r.arg);
  if (r.head === 'papers') return viewPapers(app);
  if (r.head === 'graph') return viewGraph(app);
  if (r.head === 'about') return viewAbout(app);
  return viewHome(app, r.q);
}
const wrap = (app, cls) => { const w = el('div', 'wrap' + (cls ? ' ' + cls : '')); app.appendChild(w); return w; };

/* ================= helpers ================= */
const inCorpus = u => !S.corpus || u.corpus === S.corpus;
const unitsOf = ids => (ids || []).map(i => UNIT[i]).filter(u => u && inCorpus(u));
const nPapers = us => new Set(us.map(u => u.artid)).size;
function cite(artid) {
  const p = PAPER[artid]; if (!p) return esc(artid);
  const au = (p.authors || []); const name = au.length ? (au.length > 2 ? au[0].split(' ').pop() + ' et al.' : au.map(a => a.split(' ').pop()).join(' and ')) : artid;
  return esc(name) + (p.year ? ' (' + p.year + ')' : '');
}
function corpusBar(host) {
  const bar = el('div', 'filter');
  bar.innerHTML = '<span>Corpus:</span>';
  const all = el('a', 'chip' + (S.corpus ? '' : ' on'), 'all corpora'); all.href = href(parseHash().head + (parseHash().arg ? '/' + parseHash().arg : ''), { corpus: '' });
  all.onclick = () => { S.corpus = ''; };
  bar.appendChild(all);
  (D.meta.corpora || []).forEach(c => {
    const a = el('a', 'chip' + (S.corpus === c.id ? ' on' : ''), esc(c.label) + ' <span class="cnt">' + c.n_papers + '</span>');
    a.href = href(parseHash().head + (parseHash().arg ? '/' + parseHash().arg : ''), { corpus: c.id });
    bar.appendChild(a);
  });
  host.appendChild(bar);
}
function exampleCard(u, opts) {
  opts = opts || {};
  const p = PAPER[u.artid] || {};
  const t = u.atlas ? '<a href="' + D.meta.atlas_url + '#/concept/' + encodeURIComponent(u.atlas.from) + '" title="concept in the atlas">' + esc(u.atlas.from_label) + '</a>' : esc(u.treatment || '?');
  const o = u.atlas ? '<a href="' + D.meta.atlas_url + '#/concept/' + encodeURIComponent(u.atlas.to) + '" title="concept in the atlas">' + esc(u.atlas.to_label) + '</a>' : esc(u.outcome || '?');
  const src = u.source && SRC[u.source] ? A('source/' + u.source, '<i class="kind" style="background:' + KINDCOL[u.source_kind] + '"></i>' + esc(SRC[u.source].label), 'src') : '';
  const where = [];
  if (!opts.noFamily) where.push(A('family/' + u.family, esc((FAM[u.family] || {}).label || nice(u.family))));
  if (!opts.noSub && u.sub_design && SUB[u.sub_design]) where.push(A('design/' + u.sub_design, esc(SUB[u.sub_design].label)));
  if (!opts.noPattern && u.pattern && PAT[u.pattern]) where.push(A('pattern/' + u.pattern, 'pattern'));
  const card = el('div', 'ex');
  card.innerHTML =
    '<div><div class="what">' + t + '<span class="arr">' + ARROW + '</span>' + o + (u.headline ? ' <span class="pill ok">headline</span>' : '') + '</div>' +
    '<div class="how">' + esc(u.summary || u.source_of_variation || '') + '</div>' +
    '<div class="meta">' + (src ? src : '') + where.map(w => '<span>' + w + '</span>').join('') +
    '<span>' + u.n_records + ' estimate' + (u.n_records === 1 ? '' : 's') + '</span></div></div>' +
    '<div class="side"><div class="cite">' + A('paper/' + u.artid, cite(u.artid)) + (p.journal ? ' <span class="j">' + esc(p.journal) + '</span>' : '') + '</div>' +
    (u.atlas && u.atlas.accepted ? '<a href="' + D.meta.atlas_url + '#/paper/' + encodeURIComponent(u.artid) + '">claim in the atlas ↗</a>' : '<a href="' + D.meta.atlas_url + '#/paper/' + encodeURIComponent(u.artid) + '">paper in the atlas ↗</a>') +
    '<a href="data/designs/' + encodeURIComponent(u.artid) + '.json">design document (JSON)</a></div>';
  return card;
}
function examples(host, units, opts) {
  if (!units.length) { host.appendChild(el('p', 'empty', 'No example yet' + (S.corpus ? ' in this corpus' : '') + '.')); return; }
  units.sort((a, b) => (b.headline - a.headline) || ((PAPER[b.artid] || {}).year || 0) - ((PAPER[a.artid] || {}).year || 0));
  units.forEach(u => host.appendChild(exampleCard(u, opts)));
}

/* ================= home: the taxonomy ================= */
function viewHome(app, q) {
  const w = wrap(app);
  const c = D.meta.counts;
  w.innerHTML = '<h1>Causal designs</h1><p class="lead">A wiki of the identification strategies behind empirical claims: each family of designs, its sub-designs, the ' +
    'general patterns they follow, and worked examples from the papers of the <a href="' + D.meta.atlas_url + '">causal atlas</a>, with every example linked back to the claim it identifies.</p>';
  const kp = el('div', 'kpis');
  [['families', c.families], ['sub-designs', c.sub_designs], ['patterns', c.patterns], ['sources of variation', c.sources], ['papers', c.papers], ['design units', c.units]]
    .forEach(([l, n]) => { const k = el('div', 'kpi'); k.innerHTML = '<b>' + n + '</b><span>' + l + '</span>'; kp.appendChild(k); });
  w.appendChild(kp);
  corpusBar(w);
  const sb = el('input', 'searchbar'); sb.placeholder = 'Search designs, patterns, sources of variation, papers…'; sb.value = q.q || '';
  const hits = el('div', 'hits');
  const show = () => {
    hits.innerHTML = '';
    const t = sb.value.trim(); if (!t) return;
    const seen = new Set();
    SEARCH.search(t).slice(0, 60).forEach(h => { const key = h.path + '|' + h.label; if (seen.has(key)) return; seen.add(key);
      const d = el('div', 'hit'); d.innerHTML = A(h.path, esc(h.label)) + '<span class="k">' + esc(h.kind) + '</span>'; hits.appendChild(d); });
    if (!hits.children.length) hits.appendChild(el('p', 'empty', 'Nothing matches.'));
  };
  sb.oninput = show; w.appendChild(sb); w.appendChild(hits); show();
  w.appendChild(el('h3', null, 'The families of designs'));
  const grid = el('div', 'fams');
  D.families.filter(f => f.id !== 'descriptive').forEach(f => {
    const fu = unitsOf(D.units.filter(u => u.family === f.id).map(u => u.id));
    const box = el('div', 'fam');
    const subs = f.sub_designs.map(id => SUB[id]).filter(Boolean).map(s => ({ s: s, n: nPapers(unitsOf(s.units)) })).sort((a, b) => b.n - a.n);
    box.innerHTML = '<h4>' + A('family/' + f.id, esc(f.label)) + '</h4><div class="n">' + nPapers(fu) + ' paper' + (nPapers(fu) === 1 ? '' : 's') + ', ' + fu.length + ' design unit' + (fu.length === 1 ? '' : 's') + '</div>' +
      '<p>' + esc(f.definition) + '</p><ul>' + subs.map(x => '<li' + (x.n ? '' : ' class="empty-sd"') + '>' + A('design/' + x.s.id, esc(x.s.label)) + '<span class="c">' + (x.n || '–') + '</span></li>').join('') + '</ul>';
    grid.appendChild(box);
  });
  w.appendChild(grid);
}

/* ================= family / sub-design / pattern ================= */
function viewFamily(app, id) {
  const f = FAM[id]; const w = wrap(app);
  if (!f) { w.innerHTML = '<p class="empty">No such family.</p>'; return; }
  const fu = unitsOf(D.units.filter(u => u.family === id).map(u => u.id));
  w.innerHTML = '<div class="crumbs">' + A('', 'Designs') + ' › ' + esc(f.label) + '</div><h1>' + esc(f.label) + '</h1><p class="defn">' + esc(f.definition) + '</p>';
  corpusBar(w);
  w.appendChild(el('h3', null, 'Sub-designs'));
  const list = el('div', 'list2');
  f.sub_designs.map(sid => SUB[sid]).filter(Boolean).map(s => ({ s: s, us: unitsOf(s.units) })).sort((a, b) => nPapers(b.us) - nPapers(a.us))
    .forEach(x => { const r = el('div', 'row'); r.innerHTML = A('design/' + x.s.id, esc(x.s.label)) + '<span class="c">' + nPapers(x.us) + ' paper' + (nPapers(x.us) === 1 ? '' : 's') + '</span>'; list.appendChild(r); });
  w.appendChild(list);
  const pats = Array.from(new Set(fu.map(u => u.pattern).filter(Boolean))).map(p => PAT[p]).filter(Boolean);
  if (pats.length) {
    w.appendChild(el('h3', null, 'General patterns in this family'));
    pats.sort((a, b) => nPapers(unitsOf(b.units)) - nPapers(unitsOf(a.units))).forEach(p => {
      const d = el('div', 'pat'); d.innerHTML = '<div class="lbl">' + A('pattern/' + p.id, esc(p.label)) + '</div><div class="m">' + nPapers(unitsOf(p.units)) + ' paper(s)</div>'; w.appendChild(d); });
  }
  w.appendChild(el('h3', null, 'Examples from papers (' + fu.length + ')'));
  examples(w, fu, { noFamily: true });
}
function viewDesign(app, id) {
  const s = SUB[id]; const w = wrap(app);
  if (!s) { w.innerHTML = '<p class="empty">No such sub-design.</p>'; return; }
  const f = FAM[s.family] || { label: nice(s.family) };
  const us = unitsOf(s.units);
  w.innerHTML = '<div class="crumbs">' + A('', 'Designs') + ' › ' + A('family/' + s.family, esc(f.label)) + ' › ' + esc(s.label) + '</div>' +
    '<h1>' + esc(s.label) + '</h1><p class="defn">' + esc(s.definition || '') + '</p>' +
    '<div class="counts"><b>' + nPapers(us) + '</b> paper' + (nPapers(us) === 1 ? '' : 's') + ', <b>' + us.length + '</b> design unit' + (us.length === 1 ? '' : 's') + (S.corpus ? ' in this corpus' : '') + '</div>';
  corpusBar(w);
  const pats = s.patterns.map(p => PAT[p]).filter(Boolean);
  if (pats.length) {
    w.appendChild(el('h3', null, 'General patterns'));
    pats.forEach(p => { const n = nPapers(unitsOf(p.units.filter(i => UNIT[i] && UNIT[i].sub_design === id)));
      const d = el('div', 'pat'); d.innerHTML = '<div class="lbl">' + A('pattern/' + p.id, esc(p.label)) + '</div><div class="m">' + (p.definition ? esc(p.definition) + ' · ' : '') + n + ' paper(s) under this sub-design</div>'; w.appendChild(d); });
  }
  const srcs = {};
  us.forEach(u => { if (u.source) srcs[u.source] = (srcs[u.source] || 0) + 1; });
  if (Object.keys(srcs).length) {
    w.appendChild(el('h3', null, 'Sources of variation used'));
    const bar = el('div', 'chips');
    Object.entries(srcs).sort((a, b) => b[1] - a[1]).forEach(([sid, n]) => { if (!SRC[sid]) return;
      bar.innerHTML += A('source/' + sid, '<i class="kind" style="background:' + KINDCOL[SRC[sid].kind] + '"></i>' + esc(SRC[sid].label) + ' <span class="cnt">' + n + '</span>', 'src') + ' '; });
    w.appendChild(bar);
  }
  w.appendChild(el('h3', null, 'Examples from papers'));
  examples(w, us, { noFamily: true, noSub: true });
}
function viewPattern(app, id) {
  const p = PAT[id]; const w = wrap(app);
  if (!p) { w.innerHTML = '<p class="empty">No such pattern.</p>'; return; }
  const us = unitsOf(p.units);
  w.innerHTML = '<div class="crumbs">' + A('', 'Designs') + ' › pattern</div><h1>' + esc(p.label) + '</h1>' + (p.definition ? '<p class="defn">' + esc(p.definition) + '</p>' : '') +
    '<p class="sub">X stands for the treatment, Y for the outcome. Used under ' + p.sub_designs.map(sid => SUB[sid] ? A('design/' + sid, esc(SUB[sid].label)) : esc(sid)).join(', ') + '.</p>';
  corpusBar(w);
  w.appendChild(el('h3', null, 'Examples from papers (' + us.length + ')'));
  examples(w, us, { noPattern: true });
}

/* ================= sources of variation ================= */
function viewSources(app) {
  const w = wrap(app);
  w.innerHTML = '<h1>Sources of variation</h1><p class="lead">What the papers exploit as exogenous: reforms, thresholds, shocks, lotteries, timing. Each source links to the treatments it has been used to identify, the opposite reading of the atlas: not what causes what, but what is taken as given.</p>';
  corpusBar(w);
  const kinds = {};
  D.sources.forEach(s => { const us = unitsOf(s.units); if (!us.length) return; (kinds[s.kind] = kinds[s.kind] || []).push({ s: s, n: nPapers(us) }); });
  Object.entries(kinds).sort((a, b) => (a[0] === 'none') - (b[0] === 'none') || b[1].length - a[1].length).forEach(([k, arr]) => {
    w.appendChild(el('h3', null, '<i class="kind" style="background:' + KINDCOL[k] + '"></i>' + (k === 'none' ? 'No exogenous source' : esc(nice(k)))));
    if (k === 'none') w.appendChild(el('p', 'sub', 'Designs that rest on conditioning alone: selection on observables, matching, within-unit variation without a shock. They have no node in the exogeneity graph.'));
    const list = el('div', 'list2');
    arr.sort((a, b) => b.n - a.n).forEach(x => { const r = el('div', 'row'); r.innerHTML = A('source/' + x.s.id, esc(x.s.label)) + '<span class="c">' + x.n + ' paper' + (x.n === 1 ? '' : 's') + '</span>'; list.appendChild(r); });
    w.appendChild(list);
  });
}
function viewSource(app, id) {
  const s = SRC[id]; const w = wrap(app);
  if (!s) { w.innerHTML = '<p class="empty">No such source.</p>'; return; }
  const us = unitsOf(s.units);
  const noneNote = s.kind === 'none' ? '<p class="defn">These designs claim no source of exogeneity beyond conditioning: treated and untreated units are compared given observables, or a unit with itself over time, without a shock, rule, lottery or timing that moves the treatment. They are listed here for completeness and have no node in the exogeneity graph.</p>' : '';
  w.innerHTML = '<div class="crumbs">' + A('sources', 'Sources of variation') + ' › ' + (s.kind === 'none' ? 'none' : esc(nice(s.kind))) + '</div><h1><i class="kind" style="background:' + KINDCOL[s.kind] + ';width:14px;height:14px"></i>' + esc(s.label) + '</h1>' + noneNote +
    '<div class="counts"><b>' + nPapers(us) + '</b> paper(s) use it, for <b>' + new Set(us.map(u => u.treatment_node)).size + '</b> treatment(s)</div>';
  corpusBar(w);
  w.appendChild(el('h3', null, s.kind === 'none' ? 'Treatments studied this way' : 'Treatments it identifies'));
  const list = el('div', 'list2');
  const byT = {};
  us.forEach(u => { (byT[u.treatment_node] = byT[u.treatment_node] || []).push(u); });
  Object.entries(byT).sort((a, b) => b[1].length - a[1].length).forEach(([t, arr]) => {
    const n = GNODE[t] || { label: t }; const r = el('div', 'row');
    const lab = n.type === 'concept' ? '<a href="' + D.meta.atlas_url + '#/concept/' + encodeURIComponent(t) + '">' + esc(n.label) + ' ↗</a>' : esc(n.label);
    r.innerHTML = lab + '<span class="c">' + nPapers(arr) + ' paper(s), ' + Array.from(new Set(arr.map(u => (FAM[u.family] || {}).label || u.family))).join(', ') + '</span>'; list.appendChild(r); });
  w.appendChild(list);
  w.appendChild(el('h3', null, 'Examples from papers'));
  examples(w, us, {});
}

/* ================= papers ================= */
function viewPapers(app) {
  const w = wrap(app);
  w.innerHTML = '<h1>Papers</h1><p class="lead">Every paper with at least one identified design, with the families it uses.</p>';
  corpusBar(w);
  const rows = D.papers.filter(p => inCorpus(p)).sort((a, b) => (b.year || 0) - (a.year || 0));
  const t = el('div', 'tablewrap');
  t.innerHTML = '<table><thead><tr><th>Paper</th><th>Journal</th><th class="num">Year</th><th>Designs</th><th class="num">Units</th><th class="num">Estimates</th></tr></thead><tbody>' +
    rows.map(p => '<tr><td>' + A('paper/' + p.artid, esc(cite(p.artid))) + '<br><span class="sub">' + esc(p.title || '') + '</span></td><td>' + esc(p.journal || '') + '</td><td class="num">' + (p.year || '') + '</td>' +
      '<td>' + p.families.filter(f => f !== 'descriptive').map(f => A('family/' + f, esc((FAM[f] || {}).label || f), 'pill')).join(' ') + '</td><td class="num">' + p.units.length + '</td><td class="num">' + (p.n_records || '') + '</td></tr>').join('') + '</tbody></table>';
  w.appendChild(t);
}
function viewPaper(app, artid) {
  const p = PAPER[artid]; const w = wrap(app);
  if (!p) { w.innerHTML = '<p class="empty">No such paper here.</p>'; return; }
  const us = p.units.map(i => UNIT[i]).filter(Boolean);
  w.innerHTML = '<div class="crumbs">' + A('papers', 'Papers') + ' › ' + esc(cite(artid)) + '</div><h1>' + esc(p.title || artid) + '</h1>' +
    '<div class="citebox"><div class="authors">' + esc((p.authors || []).join(', ')) + (p.year ? ' · ' + p.year : '') + (p.journal ? ' · ' + esc(p.journal) : '') + '</div>' +
    (p.doi ? '<div class="sub"><a href="https://doi.org/' + encodeURIComponent(p.doi) + '">doi:' + esc(p.doi) + '</a></div>' : '') +
    '<div class="sub"><a href="' + D.meta.atlas_url + '#/paper/' + encodeURIComponent(artid) + '">this paper in the causal atlas ↗</a> · <a href="data/designs/' + encodeURIComponent(artid) + '.json">design document (JSON, pointers and short quotes only)</a></div></div>' +
    '<div class="counts"><b>' + us.length + '</b> design unit(s) over <b>' + (p.n_records || '?') + '</b> estimate records' + (p.n_descriptive ? ', of which ' + p.n_descriptive + ' descriptive' : '') + '</div>';
  w.appendChild(el('h3', null, 'Designs in this paper'));
  examples(w, us, {});
}

/* ================= the exogeneity graph ================= */
function viewGraph(app) {
  const w = wrap(app);
  w.innerHTML = '<h1>Exogeneity graph</h1><p class="lead">The atlas maps what causes what; this map shows what the papers take as exogenous. A coloured node is a source of variation (a reform, a threshold, a shock, a lottery); a grey node is the treatment it identifies. An edge means at least one paper uses the source to identify that treatment; its colour is the design family. Click a node to isolate its neighbourhood.</p>';
  corpusBar(w);
  const edges = D.graph.edges.map(e => Object.assign({}, e, { units: e.units.filter(i => UNIT[i] && inCorpus(UNIT[i])) })).filter(e => e.units.length);
  const nodeIds = new Set(); edges.forEach(e => { nodeIds.add(e.from); nodeIds.add(e.to); });
  const minN = el('div', 'toggles');
  minN.innerHTML = '<label><input type="checkbox" id="only2"> sources used by two or more papers only</label>';
  w.appendChild(minN);
  const host = el('div'); host.id = 'graph'; w.appendChild(host);
  const leg = el('div', 'legend');
  leg.innerHTML = (D.meta.source_kinds || []).map(k => '<span><i class="dot" style="background:' + KINDCOL[k] + '"></i>' + esc(nice(k)) + '</span>').join('') + '<span><i class="dot" style="background:#bbb"></i>treatment</span>';
  w.appendChild(leg);
  const panel = el('div', 'gpanel'); panel.innerHTML = '<span class="hint">Click a source or a treatment.</span>'; w.appendChild(panel);
  const draw = () => {
    const only2 = $('#only2').checked;
    const es = only2 ? edges.filter(e => (SRC[e.from] || { n_papers: 0 }).n_papers >= 2) : edges;
    const ids = new Set(); es.forEach(e => { ids.add(e.from); ids.add(e.to); });
    drawExo(host, [...ids].map(i => GNODE[i]).filter(Boolean), es, panel);
  };
  $('#only2').onchange = draw; draw();
}
function drawExo(host, nodes, edges, panel) {
  host.innerHTML = '';
  const W = host.clientWidth || 1000, H = host.clientHeight || 600;
  nodes = nodes.map(n => Object.assign({}, n));
  const byId = {}; nodes.forEach(n => byId[n.id] = n);
  const links = edges.filter(e => byId[e.from] && byId[e.to]).map(e => ({ source: e.from, target: e.to, e: e }));
  const deg = {}; links.forEach(l => { deg[l.source] = (deg[l.source] || 0) + 1; deg[l.target] = (deg[l.target] || 0) + 1; });
  const svg = d3.select(host).append('svg').attr('viewBox', [0, 0, W, H]);
  const g = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.2, 5]).on('zoom', ev => g.attr('transform', ev.transform)); svg.call(zoom);
  const rOf = d => d.type === 'source' ? 7 + Math.min(22, (d.n || 1) * 2.2) : 4 + Math.min(10, (deg[d.id] || 1) * 1.2);
  const col = d => d.type === 'source' ? (KINDCOL[d.kind] || '#888') : '#bbb';
  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', d => FAMCOL[d.e.family] || '#999').attr('stroke-opacity', .55).attr('stroke-width', d => 1 + Math.min(5, d.e.n_papers - 1) * .8).attr('stroke-linecap', 'round')
    .style('cursor', 'pointer').on('click', (ev, d) => { ev.stopPropagation(); showEdgePanel(panel, d.e); });
  link.append('title').text(d => (byId[d.source] || {}).label + ' ' + ARROW + ' ' + (byId[d.target] || {}).label + ': ' + d.e.n_papers + ' paper(s), ' + nice(d.e.family));
  const node = g.append('g').selectAll('g').data(nodes).join('g').style('cursor', 'pointer')
    .on('click', (ev, d) => { ev.stopPropagation(); focus(d.id); showNodePanel(panel, d, links); })
    .call(d3.drag().on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(.25).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; }).on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); }));
  node.append('circle').attr('r', rOf).attr('fill', col).attr('fill-opacity', d => d.type === 'source' ? .9 : .7).attr('stroke', '#fff').attr('stroke-width', 1.2);
  node.append('text').text(d => d.label).attr('x', d => rOf(d) + 4).attr('dy', '.32em').attr('font-size', d => d.type === 'source' ? 12 : 10.5)
    .attr('font-family', d => d.type === 'source' ? 'Georgia,serif' : 'Helvetica,Arial,sans-serif').attr('fill', d => d.type === 'source' ? '#111' : '#555')
    .attr('paint-order', 'stroke').attr('stroke', '#fffff8').attr('stroke-width', 3);
  node.append('title').text(d => d.label + (d.type === 'source' ? ' — source of variation (' + nice(d.kind) + '), ' + d.n + ' paper(s)' : ' — treatment'));
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(l => 60 + 10 * Math.min(6, l.e.n_papers)).strength(.4))
    .force('charge', d3.forceManyBody().strength(d => d.type === 'source' ? -500 : -180).distanceMax(700))
    .force('center', d3.forceCenter(W / 2, H / 2).strength(.06))
    .force('collide', d3.forceCollide().radius(d => rOf(d) + 14))
    .force('x', d3.forceX(W / 2).strength(.03)).force('y', d3.forceY(H / 2).strength(.05))
    .on('tick', () => { link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y); node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')'); })
    .on('end', () => { if (!host.__settled) fit(); host.__settled = true; });
  function fit() {
    if (!nodes.length) return;
    const xs = nodes.map(d => d.x), ys = nodes.map(d => d.y), pad = 80;
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.max(.2, Math.min(1.3, .95 * Math.min(W / (x1 - x0 + 2 * pad), H / (y1 - y0 + pad))));
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - k * (x0 + x1) / 2, H / 2 - k * (y0 + y1) / 2).scale(k));
  }
  const sid = x => (x && typeof x === 'object') ? x.id : x;
  function focus(id) {
    if (!id) { node.classed('dim', false); link.classed('dim', false); return; }
    const keep = new Set([id]); links.forEach(l => { if (sid(l.source) === id) keep.add(sid(l.target)); if (sid(l.target) === id) keep.add(sid(l.source)); });
    node.classed('dim', d => !keep.has(d.id)); link.classed('dim', l => sid(l.source) !== id && sid(l.target) !== id);
  }
  svg.on('click', () => { focus(null); panel.innerHTML = '<span class="hint">Click a source or a treatment.</span>'; });
}
function showNodePanel(panel, d, links) {
  const sid = x => (x && typeof x === 'object') ? x.id : x;
  const nb = links.filter(l => sid(l.source) === d.id || sid(l.target) === d.id);
  let h = '<h4>' + esc(d.label) + '</h4><div class="sub">' + (d.type === 'source' ? 'source of variation · ' + esc(nice(d.kind)) + ' · ' + A('source/' + d.id, 'its page') : 'treatment' + (d.type === 'concept' ? ' · <a href="' + D.meta.atlas_url + '#/concept/' + encodeURIComponent(d.id) + '">concept in the atlas ↗</a>' : '')) + '</div>';
  nb.sort((a, b) => b.e.n_papers - a.e.n_papers).forEach(l => {
    const other = sid(l.source) === d.id ? sid(l.target) : sid(l.source); const o = GNODE[other] || { label: other };
    const papers = Array.from(new Set(l.e.units.map(i => UNIT[i] && UNIT[i].artid).filter(Boolean)));
    h += '<div class="row"><span>' + (d.type === 'source' ? ARROW + ' ' : '') + esc(o.label) + (d.type !== 'source' ? ' ' + ARROW : '') + ' <span class="pill" style="border-color:' + FAMCOL[l.e.family] + ';color:' + FAMCOL[l.e.family] + '">' + esc((FAM[l.e.family] || {}).label || l.e.family) + '</span></span>' +
      '<span>' + papers.map(a => A('paper/' + a, cite(a))).join(', ') + '</span></div>';
  });
  panel.innerHTML = h;
}
function showEdgePanel(panel, e) {
  const s = GNODE[e.from] || { label: e.from }, t = GNODE[e.to] || { label: e.to };
  let h = '<h4>' + esc(s.label) + ' ' + ARROW + ' ' + esc(t.label) + '</h4><div class="sub">' + e.n_papers + ' paper(s) · ' + Object.entries(e.families).map(([f, n]) => esc((FAM[f] || {}).label || f) + ' (' + n + ')').join(', ') + '</div>';
  e.units.forEach(i => { const u = UNIT[i]; if (!u) return; h += '<div class="row"><span>' + esc(u.summary || '') + '</span><span>' + A('paper/' + u.artid, cite(u.artid)) + '</span></div>'; });
  panel.innerHTML = h;
}

/* ================= about ================= */
function viewAbout(app) {
  const w = wrap(app, 'about');
  w.innerHTML = '<h1>About</h1>' +
    '<p>Causal Designs is a wiki of identification strategies, built automatically from the design documents of the <a href="' + D.meta.atlas_url + '">Danish Causal Atlas</a> pipeline. ' +
    'For every paper the pipeline extracts one record per estimate: the strategy, the source of variation, the instrument, the key assumptions, the population, the estimand. ' +
    'A taxonomy pass then groups those records into design units and places each unit in this wiki: a <b>family</b> (instrumental variables, difference in differences, …), a <b>sub-design</b> (shift-share instrument, staggered adoption, …), ' +
    'a <b>general pattern</b> stated with X for the treatment and Y for the outcome, and a normalised <b>source of variation</b>. The dictionaries grow as papers are added; a new sub-design or source enters with a definition the next paper can reuse.</p>' +
    '<p>The <a href="' + href('graph') + '">exogeneity graph</a> is the atlas read backwards: it connects each source of variation to the treatments it has been used to identify, across papers and families.</p>' +
    '<p>The corpus filter keeps the wiki open to other collections: the atlas links here with its own corpus preselected, and every family, sub-design and pattern page shows the examples of the chosen corpus only.</p>' +
    '<h3>What the design documents published here contain</h3>' +
    '<p>Each paper\'s design document is served as JSON with every pointer into the paper (page, exhibit, cell and figure ids) and the extractor\'s own descriptions of strategy, assumptions and population. ' +
    'Verbatim text from the papers is reduced to what quotation allows: one short anchor sentence per record, at most fifteen distinct sentences per paper, each with its page; every other quote is kept as a hash and a length so a reader with the paper can verify it. ' +
    'The papers themselves remain with their publishers.</p>' +
    '<p class="sub">Built ' + esc((D.meta.built_at || '').replace('T', ' ').slice(0, 16)) + ' UTC · ' + D.meta.counts.papers + ' papers · ' + D.meta.counts.units + ' design units.</p>';
}
