'use strict';
const $ = (id) => document.getElementById(id);
$('logo').innerHTML = LOGO;

let etat = null;       // dernier état envoyé par le plugin (sélection, tokens, candidats, thèmes)
let mode = 'new';      // thème : 'new' | 'existing'
let vue = 'ed';        // 'ed' (édition) | 'ap' (aperçu) | 'res' (résultat)

const variante = () => $('variante').value.trim() || 'Tablette';

// ---------------------------------------------------------------- utilitaires DOM
function el(tag, cls, texte) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texte !== undefined) e.textContent = texte;
  return e;
}
function option(valeur, texte) { const o = document.createElement('option'); o.value = valeur; o.textContent = texte; return o; }
function groupe(label) { const g = document.createElement('optgroup'); g.label = label; return g; }
function gras(texte) { return el('b', null, texte); }
function montrer(v) {
  const change = v !== vue;
  vue = v;
  $('ed').hidden = v !== 'ed' || !etat || !etat.selection;
  $('ap').hidden = v !== 'ap';
  $('res').hidden = v !== 'res';
  $('vide').hidden = !(v === 'ed' && (!etat || !etat.selection));
  if (change) document.querySelector('main').scrollTop = 0;
}

// ---------------------------------------------------------------- tableau Desktop / Tablette
function choixDe(l) {
  const sel = l.querySelector('select').value;
  const inp = l.querySelector('input');
  if (inp.value !== '' && !inp.disabled) {
    const n = Number(inp.value);
    return Number.isNaN(n) ? null : { kind: 'free', valeur: n };
  }
  if (sel.startsWith('s:')) return { kind: 'semantic', ref: '{' + sel.slice(2) + '}' };
  if (sel.startsWith('f:')) return { kind: 'foundation', ref: '{' + sel.slice(2) + '}' };
  return null;
}

// Valeur Tablette telle qu'elle résulterait du choix (lue dans les candidats déjà connus).
function valeurTablette(t, ch) {
  if (!ch) return t.resolu;
  if (ch.kind === 'free') return String(ch.valeur);
  const nom = ch.ref.slice(1, -1);
  const k = (etat.candidats[t.type] || []).find((c) => c.name === nom);
  return k ? k.resolu : '?';
}

function majLigne(l) {
  const t = l._t;
  const ch = choixDe(l);
  l.classList.toggle('change', !!ch);
  const tab = valeurTablette(t, ch);
  l.querySelector('.c-tab .v').textContent = ch ? tab : '=';
  const d = l.querySelector('.delta');
  d.textContent = '';
  if (ch) {
    const a = parseFloat(t.resolu), b = parseFloat(tab);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) {
      const e = Math.round((b - a) * 100) / 100;
      d.textContent = (e > 0 ? '+' : '−') + Math.abs(e);
    }
  }
}

function majJeux() {
  const v = variante();
  $('nomVar').textContent = v; $('thVar').textContent = v;
  const jeux = new Set();
  $('liste').querySelectorAll('.rw').forEach((l) => {
    majLigne(l);
    const ch = choixDe(l);
    if (ch) jeux.add((ch.kind === 'semantic' ? l._t.set : l._t.semSet) + '-' + v);
  });
  $('jeux').textContent = jeux.size ? 'Jeux utilisés : ' + Array.from(jeux).join(', ') : 'Aucun token modifié pour l’instant.';
}

function construireLigne(t, memo) {
  const l = el('div', 'rw');
  l._t = t; l.dataset.name = t.name; l.setAttribute('role', 'row');

  const cn = el('div', 'c-nom');
  const ic = document.createElement('span'); ic.innerHTML = icType(t.type);
  const bloc = el('div');
  const nom = el('div', 'nom', t.name); nom.title = t.name;
  const lib = TYPES[t.type] ? TYPES[t.type].label : t.type;
  const chaine = t.niveau === 3 ? (t.sem ? 'via ' + t.sem : 'sans sémantique') : t.niveau === 2 ? 'sémantique' : 'fondation directe';
  const extra = [];
  if (t.composants.length > 1) extra.push(t.composants.length + ' composants');
  if (t.sem && t.conso > 1) extra.push('sémantique partagé ×' + t.conso);
  const sub = el('div', 'sub', [chaine].concat(extra).join(' · ')); sub.title = lib + ' · ' + sub.textContent;
  bloc.append(nom, sub);
  const compsSel = (etat.composants || []).filter((c) => (t.composants || []).indexOf(c.id) >= 0).map((c) => c.nom);
  const autres = (t.utilisePar || []).filter((n) => n !== t.name);
  if (compsSel.length || autres.length) {
    const d = document.createElement('details'); d.className = 'use';
    const sm = document.createElement('summary'); sm.textContent = 'Utilisé par';
    d.appendChild(sm);
    if (compsSel.length) d.appendChild(el('div', 'li-use', 'Sélection : ' + compsSel.join(', ')));
    if (autres.length) d.appendChild(el('div', 'li-use', 'Autres tokens de composants sur ' + t.sem + ' : ' + autres.join(', ')));
    bloc.appendChild(d);
  }
  cn.append(ic.firstChild, bloc);

  const desk = el('div', 'c-desk', t.resolu);
  const tab = el('div', 'c-tab'); tab.append(el('span', 'v', '='), el('span', 'delta'));

  const mod = el('div', 'c-mod');
  const s = document.createElement('select');
  s.setAttribute('aria-label', 'Remplacement pour ' + t.name);
  s.appendChild(option('', '— inchangé —'));
  const cands = etat.candidats[t.type] || [];
  if (t.niveau === 3) {
    const g = groupe('Sémantique · ce composant seulement');
    cands.filter((k) => k.niveau === 2 && k.name !== t.sem).forEach((k) => g.appendChild(option('s:' + k.name, k.name + '  (' + k.resolu + ')')));
    if (g.children.length) s.appendChild(g);
  }
  const peutLibre = !!t.sem && t.type !== 'typography';
  if (peutLibre) {
    const g = groupe('Fondation · change le sémantique');
    cands.filter((k) => k.niveau === 1).forEach((k) => g.appendChild(option('f:' + k.name, k.name + '  (' + k.resolu + ')')));
    if (g.children.length) s.appendChild(g);
  }
  const i = document.createElement('input');
  i.type = 'number'; i.placeholder = 'libre'; i.setAttribute('aria-label', 'Valeur libre pour ' + t.name);
  i.disabled = !peutLibre;
  i.hidden = t.type === 'typography';              // valeur composite : pas de saisie libre
  if (t.niveau === 1) { s.disabled = true; l.classList.add('bloque'); }
  const w = el('div', 'sel'); w.innerHTML = icType(t.type); w.appendChild(s);
  mod.append(w, i);

  const m = memo[t.name];
  if (m) { s.value = m.ref; i.value = m.val; }
  s.addEventListener('change', () => { if (s.value) i.value = ''; majJeux(); });
  i.addEventListener('input', () => { if (i.value !== '') s.value = ''; majJeux(); });
  l.append(cn, desk, tab, mod);
  return l;
}

function rendre() {
  if (!etat || !etat.selection) { montrer('ed'); return; }
  const liste = $('liste');
  const memo = {};
  liste.querySelectorAll('.rw').forEach((l) => { memo[l.dataset.name] = { ref: l.querySelector('select').value, val: l.querySelector('input').value }; });
  liste.textContent = '';

  const chips = $('composants'); chips.textContent = '';
  etat.composants.forEach((c) => {
    const ch = el('span', 'chip');
    ch.append(el('span', null, c.nom + ' · ' + c.nbTokens + ' token' + (c.nbTokens > 1 ? 's' : '')));
    if (c.nbFixes || c.nbManquants) {
      const p = el('span', 'pt'); p.title = c.nbFixes + ' valeur(s) fixe(s), ' + c.nbManquants + ' token(s) manquant(s)'; ch.append(p);
    }
    chips.appendChild(ch);
  });

  $('aucun').hidden = etat.tokens.length > 0;
  etat.tokens.forEach((t) => liste.appendChild(construireLigne(t, memo)));
  majJeux();

  const ex = $('themeExistant'); ex.textContent = '';
  etat.themes.forEach((th) => ex.appendChild(option(th.id, (th.group ? th.group + ' / ' : '') + th.name)));
}

// ---------------------------------------------------------------- charge utile commune (aperçu + application)
function payload(type) {
  const tokens = [];
  $('liste').querySelectorAll('.rw').forEach((l) => {
    const choix = choixDe(l);
    if (choix) tokens.push({ name: l._t.name, choix });
  });
  return {
    type, variante: variante(), tokens, themeMode: mode,
    themeGroup: $('themeGroup').value.trim(), themeName: $('themeName').value.trim(),
    themeId: $('themeExistant').value, activer: $('activer').checked,
  };
}

// ---------------------------------------------------------------- aperçu
const LIB_ACTION = { creer: 'Créer', maj: 'Surcharger', identique: 'Identique' };
const LIB_MANQUANT = {
  introuvable: 'token introuvable dans les jeux',
  'sans-semantique': 'ne passe pas par un sémantique',
  'fondation-directe': 'lié directement à une fondation',
};
const LIB_STATUT = { converti: ['Converti', 'p'], partiel: ['Partiel', 'w'], 'non-converti': ['Non converti', 'f'] };

function section(titre) { const b = el('div', 'bloc'); b.appendChild(el('h3', null, titre)); return b; }
function limiter(liste, max, fabrique, parent) {
  liste.slice(0, max).forEach((x) => parent.appendChild(fabrique(x)));
  if (liste.length > max) parent.appendChild(el('div', 'mut', '… et ' + (liste.length - max) + ' autre(s)'));
}

function rendreRapport(r, cible) {
  const sum = el('div', 'sum');
  const p = (txt, c) => el('span', 'pill ' + c, txt);
  sum.append(p(r.resume.total + ' composant' + (r.resume.total > 1 ? 's' : ''), 'n'));
  sum.append(p(r.resume.convertis + ' converti(s)', 'p'));
  if (r.resume.partiels) sum.append(p(r.resume.partiels + ' partiel(s)', 'w'));
  if (r.resume.nonConvertis) sum.append(p(r.resume.nonConvertis + ' non converti(s)', 'f'));
  cible.appendChild(sum);

  const bc = section('Composants');
  r.composants.forEach((c) => {
    const carte = el('div', 'cmp');
    const tete = el('div', 'tete'); tete.append(el('span', null, c.nom));
    const [lib, cls] = LIB_STATUT[c.statut]; tete.append(el('span', 'pill ' + cls, lib));
    carte.appendChild(tete);
    carte.appendChild(el('div', 'mut', c.modifies.length ? c.modifies.length + ' token(s) concerné(s) : ' + c.modifies.join(', ') : 'Aucun token concerné'));
    bc.appendChild(carte);
  });
  cible.appendChild(bc);

  const manquants = [];
  r.composants.forEach((c) => c.manquants.forEach((m) => manquants.push({ c: c.nom, ...m })));
  const bm = section('Tokens manquants');
  if (!manquants.length) bm.appendChild(el('div', 'mut', 'Aucun.'));
  limiter(manquants, 40, (m) => {
    const li = el('div', 'li'); li.append(gras(m.token), el('span', 'mut', m.c + ' › ' + m.calque + ' — ' + LIB_MANQUANT[m.raison])); return li;
  }, bm);
  cible.appendChild(bm);

  const fixes = [];
  r.composants.forEach((c) => c.fixes.forEach((f) => fixes.push({ c: c.nom, ...f })));
  const bf = section('Valeurs fixes non converties');
  if (!fixes.length) bf.appendChild(el('div', 'mut', 'Aucune.'));
  limiter(fixes, 40, (f) => {
    const li = el('div', 'li'); li.append(gras(f.propriete + ' = ' + f.valeur), el('span', 'mut', f.c + ' › ' + f.calque)); return li;
  }, bf);
  cible.appendChild(bf);
}

function rendreApercu(plan) {
  const c = $('apContenu'); c.textContent = '';
  if (plan.erreurs.length) {
    const a = el('div', 'alert ko'); plan.erreurs.forEach((e) => a.appendChild(el('div', null, e))); c.appendChild(a);
  }
  if (plan.avertissements.length) {
    const a = el('div', 'alert warn'); plan.avertissements.forEach((e) => a.appendChild(el('div', null, e))); c.appendChild(a);
  }
  if (plan.ops.length || plan.fondations.length) {
    const b = section('Ce qui sera écrit');
    plan.fondations.forEach((f) => {
      const li = el('div', 'li'); li.append(el('span', 'pill p', 'Créer'), gras(f.nom), el('span', 'mut', 'fondation dans ' + f.set), el('span', 'vals', '= ' + f.valeur)); b.appendChild(li);
    });
    plan.ops.forEach((o) => {
      const li = el('div', 'li');
      li.append(el('span', 'pill ' + (o.action === 'creer' ? 'p' : o.action === 'maj' ? 'w' : 'n'), LIB_ACTION[o.action]), gras(o.token), el('span', 'mut', 'dans ' + o.jeu), el('span', 'vals', o.avant + ' → ' + o.apres));
      b.appendChild(li);
    });
    c.appendChild(b);
  }
  if (plan.theme) {
    const b = section('Thème');
    const li = el('div', 'li');
    li.append(gras((plan.theme.groupe ? plan.theme.groupe + ' / ' : '') + plan.theme.nom), el('span', 'mut', plan.theme.existe ? 'thème existant' : 'nouveau thème'));
    b.appendChild(li);
    b.appendChild(el('div', 'mut', 'Jeux rattachés : ' + plan.setsTheme.join(', ')));
    c.appendChild(b);
  }
  if (plan.rapport) { c.appendChild(el('h2', null, 'Rapport prévu')); rendreRapport(plan.rapport, c); }
  $('appliquer').disabled = plan.erreurs.length > 0;
  $('msgAp').hidden = true;
}

// ---------------------------------------------------------------- événements
$('variante').addEventListener('input', majJeux);

document.querySelectorAll('#mode button').forEach((bt) => bt.addEventListener('click', () => {
  mode = bt.dataset.mode;
  document.querySelectorAll('#mode button').forEach((x) => x.setAttribute('aria-pressed', String(x === bt)));
  $('blocNew').hidden = mode !== 'new';
  $('themeExistant').hidden = mode !== 'existing';
}));

$('apercu').addEventListener('click', () => { $('apercu').disabled = true; parent.postMessage(payload('planifier'), '*'); });
$('retour').addEventListener('click', () => montrer('ed'));
$('appliquer').addEventListener('click', () => { $('appliquer').disabled = true; parent.postMessage(payload('appliquer'), '*'); });
$('defaire').addEventListener('click', () => { $('defaire').disabled = true; parent.postMessage({ type: 'annuler' }, '*'); });
$('terminer').addEventListener('click', () => montrer('ed'));

window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || !m.type) return;
  if (m.type === 'etat') {
    etat = m; rendre();
    if (vue === 'ap') montrer('ed');                // la sélection a changé : l'aperçu n'est plus valable
    else montrer(vue);
  }
  if (m.type === 'plan') { $('apercu').disabled = false; rendreApercu(m.plan); montrer('ap'); }
  if (m.type === 'fini') {
    if (!m.ok) { const b = $('msgAp'); b.hidden = false; b.className = 'alert ko'; b.textContent = m.message; $('appliquer').disabled = false; return; }
    const c = $('resContenu'); c.textContent = '';
    rendreRapport(m.rapport, c);
    $('defaire').hidden = false; $('defaire').disabled = false;
    montrer('res');
  }
  if (m.type === 'annule') {
    const c = $('resContenu'); c.textContent = '';
    const b = el('div', m.ok ? 'alert warn' : 'alert ko', m.ok ? 'Conversion annulée : jeux, tokens et thème créés ont été retirés.' : m.message);
    c.appendChild(b);
    $('defaire').hidden = true; $('defaire').disabled = false;
  }
});

parent.postMessage({ type: 'ready' }, '*');
