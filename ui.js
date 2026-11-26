'use strict';
const $ = (id) => document.getElementById(id);
$('logo').innerHTML = LOGO;
let etat = null;
let mode = 'new';

// Nom d'une fondation littérale créée pour une valeur libre (suit les motifs existants du fichier).
const PREFIXES = { spacing: 'spacing.dense', borderRadius: 'radius.dense', fontSizes: 'font.size', borderWidth: 'border.width', sizing: 'sizing', dimension: 'dimension', letterSpacing: 'letter-spacing' };
const nomFondation = (type, v) => (PREFIXES[type] || type) + '.' + String(v).replace(/^-/, 'neg-').replace(/\./g, '-');

const variante = () => $('variante').value.trim() || 'Tablette';

function option(valeur, texte) {
  const o = document.createElement('option');
  o.value = valeur; o.textContent = texte; return o;
}
function groupe(label) {
  const g = document.createElement('optgroup');
  g.label = label; return g;
}

// Lit le choix d'une ligne : { kind: 'semantic'|'foundation'|'free', ... } ou null
function choixDe(l) {
  const t = l._t;
  const sel = l.querySelector('select').value;
  const val = l.querySelector('input').value;
  if (val !== '' && !l.querySelector('input').disabled) {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    const nom = nomFondation(t.type, val);
    const ex = (etat.candidats[t.type] || []).find((c) => c.niveau === 1 && Number(c.resolu) === n);
    return { kind: 'free', valeur: n, fondationNom: ex ? ex.name : nom, existe: !!ex };
  }
  if (sel.startsWith('s:')) return { kind: 'semantic', ref: '{' + sel.slice(2) + '}' };
  if (sel.startsWith('f:')) return { kind: 'foundation', ref: '{' + sel.slice(2) + '}' };
  return null;
}

function majLigne(l) {
  const t = l._t, v = variante();
  const ch = choixDe(l);
  l.classList.toggle('change', !!ch);
  const h = l.querySelector('.hint');
  h.textContent = '';
  const gras = (txt) => { const b = document.createElement('b'); b.textContent = txt; return b; };
  if (!ch) return;
  if (ch.kind === 'semantic') {
    h.append('Surcharge ', gras(t.name), ' dans ' + t.set + '-' + v);
  } else {
    const partage = t.conso > 1 ? ' (aussi utilisé par ' + (t.conso - 1) + ' autre(s) composant(s))' : '';
    if (ch.kind === 'free') {
      h.append(ch.existe ? 'Fondation existante ' : 'Crée la fondation ', gras(ch.fondationNom), ' · puis ');
    }
    h.append('surcharge ', gras(t.sem), ' dans ' + t.semSet + '-' + v + partage);
  }
}

function majJeux() {
  const v = variante();
  const jeux = new Set();
  $('liste').querySelectorAll('.tok').forEach((l) => {
    const ch = choixDe(l);
    if (!ch) return;
    jeux.add((ch.kind === 'semantic' ? l._t.set : l._t.semSet) + '-' + v);
  });
  $('jeux').textContent = jeux.size ? 'Jeux utilisés : ' + Array.from(jeux).join(', ') : 'Aucun token modifié pour l’instant.';
  $('liste').querySelectorAll('.tok').forEach(majLigne);
}

function rendre() {
  const vide = !etat || !etat.selection;
  $('vide').hidden = !vide;
  $('app').hidden = vide;
  if (vide) return;

  $('sel').textContent = etat.selection;
  const liste = $('liste');
  const memo = {};
  liste.querySelectorAll('.tok').forEach((l) => {
    memo[l.dataset.name] = { ref: l.querySelector('select').value, val: l.querySelector('input').value };
  });
  liste.textContent = '';
  $('aucun').hidden = etat.tokens.length > 0;

  for (const t of etat.tokens) {
    const l = document.createElement('div');
    l._t = t;
    l.className = 'tok'; l.dataset.name = t.name;
    const n = document.createElement('div'); n.className = 'nom'; n.textContent = t.name;
    const a = document.createElement('div'); a.className = 'actuel';
    const lib = TYPES[t.type] ? TYPES[t.type].label : t.type;
    const chaine = t.niveau === 3 ? (t.sem ? ' · via ' + t.sem : ' · sans sémantique')
      : t.niveau === 2 ? ' · token sémantique' : ' · lié directement à une fondation';
    a.textContent = lib + ' · actuel : ' + t.resolu + chaine;

    const c = document.createElement('div'); c.className = 'champs';
    const s = document.createElement('select');
    s.setAttribute('aria-label', 'Remplacement pour ' + t.name);
    s.appendChild(option('', '— inchangé —'));
    const cands = etat.candidats[t.type] || [];
    if (t.niveau === 3) {
      const g = groupe('Sémantique · ce composant seulement');
      cands.filter((k) => k.niveau === 2 && k.name !== t.sem).forEach((k) => g.appendChild(option('s:' + k.name, k.name + '  (' + k.resolu + ')')));
      if (g.children.length) s.appendChild(g);
    }
    const peutFondation = !!t.sem && t.type !== 'typography';
    if (peutFondation) {
      const g = groupe('Fondation · change le sémantique');
      cands.filter((k) => k.niveau === 1).forEach((k) => g.appendChild(option('f:' + k.name, k.name + '  (' + k.resolu + ')')));
      if (g.children.length) s.appendChild(g);
    }
    const i = document.createElement('input');
    i.type = 'number'; i.placeholder = 'valeur libre';
    i.setAttribute('aria-label', 'Valeur libre pour ' + t.name);
    i.disabled = !peutFondation;
    if (t.niveau === 1) { s.disabled = true; l.classList.add('bloque'); }
    const w = document.createElement('div'); w.className = 'sel';
    w.innerHTML = icType(t.type);
    w.appendChild(s);
    c.append(w, i);
    const h = document.createElement('div'); h.className = 'hint';
    l.append(n, a, c, h);
    const m = memo[t.name];
    if (m) { s.value = m.ref; i.value = m.val; }
    s.addEventListener('change', () => { if (s.value) i.value = ''; majJeux(); });
    i.addEventListener('input', () => { if (i.value !== '') s.value = ''; majJeux(); });
    liste.appendChild(l);
  }
  majJeux();

  const ex = $('themeExistant');
  ex.textContent = '';
  etat.themes.forEach((th) => ex.appendChild(option(th.id, (th.group ? th.group + ' / ' : '') + th.name)));
}

$('variante').addEventListener('input', majJeux);

document.querySelectorAll('#mode button').forEach((bt) =>
  bt.addEventListener('click', () => {
    mode = bt.dataset.mode;
    document.querySelectorAll('#mode button').forEach((x) => x.setAttribute('aria-pressed', String(x === bt)));
    $('blocNew').hidden = mode !== 'new';
    $('themeExistant').hidden = mode !== 'existing';
  })
);

$('go').addEventListener('click', () => {
  const tokens = [];
  $('liste').querySelectorAll('.tok').forEach((l) => {
    const choix = choixDe(l);
    if (!choix) return;
    const t = l._t;
    tokens.push({ name: t.name, type: t.type, niveau: t.niveau, set: t.set, sem: t.sem, semSet: t.semSet, choix });
  });
  const setsSources = Array.from(new Set(etat.tokens.flatMap((t) => [t.set, t.semSet].filter(Boolean))));
  $('go').disabled = true;
  parent.postMessage({
    type: 'appliquer',
    variante: variante(),
    tokens,
    themeMode: mode,
    themeGroup: $('themeGroup').value.trim(),
    themeName: $('themeName').value.trim(),
    themeId: $('themeExistant').value,
    activer: $('activer').checked,
    setsSources,
  }, '*');
});

window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || !m.type) return;
  if (m.type === 'etat') { etat = m; rendre(); }
  if (m.type === 'fini') {
    $('go').disabled = false;
    const box = $('msg');
    box.hidden = false;
    box.className = m.ok ? 'ok' : 'ko';
    box.textContent = m.message;
  }
});

parent.postMessage({ type: 'ready' }, '*');
