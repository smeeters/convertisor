// Component convertisor : décline un composant tokenisé en variante (tablette, mobile…)
// en respectant les 3 niveaux Fondation → Sémantique → Composants.
// Règle : le mode/appareil vit dans le SET, jamais dans le nom (mêmes noms que la base).

penpot.ui.open("Component convertisor", "https://smeeters.github.io/convertisor/index.html", {
  width: 480,
  height: 760,
});

const TYPES_TAILLE = [
  "spacing", "sizing", "dimension", "borderRadius",
  "borderWidth", "fontSizes", "letterSpacing", "typography",
];

const cat = () => penpot.library.local.tokens;
// Niveau d'un set d'après son préfixe : 01-… = 1 (fondation), 02-… = 2 (sémantique), 03-… = 3 (composants)
const niveau = (nomSet) => { const m = /^0?(\d)/.exec(nomSet); return m ? Number(m[1]) : 0; };
const refDe = (v) => {
  if (typeof v !== "string") return null;
  const m = /^\{(.+)\}$/.exec(v.trim());
  return m ? m[1] : null;
};

function decrire(tk) {
  const r = tk.resolvedValue;
  if (r === undefined || r === null) return "?";
  if (Array.isArray(r) && typeof r[0] === "object") {
    const t = r[0];
    return [t.fontSizes ? t.fontSizes + "px" : null, t.fontWeights ? "w" + t.fontWeights : null].filter(Boolean).join(" ");
  }
  return String(r);
}

// Index nom -> { tk, set } ; le premier set rencontré fait foi (les sets de variante sont ajoutés en fin).
function indexer() {
  const idx = new Map();
  for (const set of cat().sets) {
    for (const tk of set.tokens) if (!idx.has(tk.name)) idx.set(tk.name, { tk, set });
  }
  return idx;
}

function entree(nom, idx) {
  const trouve = idx.get(nom);
  if (!trouve || !TYPES_TAILLE.includes(trouve.tk.type)) return null;
  const { tk, set } = trouve;
  const niv = niveau(set.name);
  const e = {
    name: nom, type: tk.type, set: set.name, niveau: niv,
    valeur: typeof tk.value === "string" ? tk.value : "(composite)",
    resolu: decrire(tk), proprietes: [],
    sem: null, semSet: null, conso: 0,
  };
  if (niv === 2) { e.sem = nom; e.semSet = set.name; }
  if (niv === 3) {
    const r = refDe(tk.value);
    const s = r && idx.get(r);
    if (s && niveau(s.set.name) === 2) { e.sem = r; e.semSet = s.set.name; }
  }
  if (e.sem) {
    const noms = new Set();
    for (const st of cat().sets) {
      if (niveau(st.name) !== 3) continue;
      for (const t of st.tokens) if (refDe(t.value) === e.sem) noms.add(t.name);
    }
    e.conso = noms.size;
  }
  return e;
}

function parcourir(shape, acc, idx) {
  if (shape.tokens) {
    for (const [prop, nom] of Object.entries(shape.tokens)) {
      if (!acc.has(nom)) { const e = entree(nom, idx); if (e) acc.set(nom, e); }
      const e = acc.get(nom);
      if (e && !e.proprietes.includes(prop)) e.proprietes.push(prop);
    }
  }
  if (shape.children) shape.children.forEach((c) => parcourir(c, acc, idx));
}

function etat() {
  const sel = penpot.selection;
  if (!sel.length) return { selection: null };
  const idx = indexer();
  const acc = new Map();
  sel.forEach((s) => parcourir(s, acc, idx));
  const candidats = {};
  const vus = new Set();
  for (const set of cat().sets) {
    const niv = niveau(set.name);
    if (niv !== 1 && niv !== 2) continue;
    for (const tk of set.tokens) {
      if (!TYPES_TAILLE.includes(tk.type) || vus.has(tk.name)) continue;
      vus.add(tk.name);
      (candidats[tk.type] = candidats[tk.type] || []).push({ name: tk.name, resolu: decrire(tk), niveau: niv });
    }
  }
  return {
    selection: sel.map((s) => s.name).join(", "),
    tokens: Array.from(acc.values()),
    candidats,
    themes: cat().themes.map((t) => ({ id: t.id, group: t.group, name: t.name, active: t.active })),
  };
}

const envoyerEtat = () => penpot.ui.sendMessage({ type: "etat", ...etat() });

// ---------------------------------------------------------------- écriture
function obtenirSet(nom) {
  return cat().sets.find((s) => s.name === nom) || cat().addSet({ name: nom });
}
function poser(set, type, nom, valeur) {
  const ex = set.tokens.find((t) => t.name === nom);
  if (ex) { ex.value = valeur; return ex; }
  return set.addToken({ type, name: nom, value: valeur });
}
// Un nœud est soit un token, soit un groupe : refuse les relations de préfixe strict.
function verifierCollision(nom) {
  for (const set of cat().sets) {
    for (const t of set.tokens) {
      if (t.name !== nom && (t.name.startsWith(nom + ".") || nom.startsWith(t.name + "."))) {
        throw new Error("Collision de nom : « " + nom + " » et « " + t.name + " » (un nom ne peut pas être le préfixe d'un autre).");
      }
    }
  }
}
function assurerFondation(type, nom, valeur) {
  const idx = indexer();
  const ex = idx.get(nom);
  if (ex) {
    if (Number(ex.tk.resolvedValue) !== Number(valeur)) {
      throw new Error("La fondation « " + nom + " » existe déjà avec une autre valeur (" + ex.tk.resolvedValue + ").");
    }
    return false;
  }
  verifierCollision(nom);
  const sets1 = cat().sets.filter((s) => niveau(s.name) === 1);
  const cible = sets1.find((s) => s.tokens.some((t) => t.type === type)) || sets1[0];
  if (!cible) throw new Error("Aucun set de fondation (01-…) trouvé.");
  cible.addToken({ type, name: nom, value: String(valeur) });
  return cible.name;
}

function appliquer(m) {
  const suffixe = (m.variante || "").trim();
  if (!suffixe) throw new Error("Donne un nom à la variante (ex. Tablette).");
  const modifs = m.tokens.filter((t) => t.choix);
  if (!modifs.length) throw new Error("Aucun token modifié.");
  const c = cat();
  const deja = new Map();
  const setsVariante = new Set();
  const fondationsCreees = [];
  const setsFondation = new Set();
  let nbSem = 0, nbComp = 0;

  for (const t of modifs) {
    const ch = t.choix;
    let nomSet, nomToken, valeur;
    if (ch.kind === "semantic") {
      nomSet = t.set + "-" + suffixe; nomToken = t.name; valeur = ch.ref;
    } else {
      if (!t.sem) throw new Error("« " + t.name + " » ne passe pas par un sémantique : choisis un token sémantique.");
      let ref = ch.ref;
      if (ch.kind === "free") {
        const cree = assurerFondation(t.type, ch.fondationNom, ch.valeur);
        if (cree) { fondationsCreees.push(ch.fondationNom); setsFondation.add(cree); }
        ref = "{" + ch.fondationNom + "}";
      }
      nomSet = t.semSet + "-" + suffixe; nomToken = t.sem; valeur = ref;
    }
    const cle = nomSet + "|" + nomToken;
    if (deja.has(cle) && deja.get(cle) !== valeur) {
      throw new Error("« " + nomToken + " » reçoit deux valeurs différentes (partagé par plusieurs tokens du composant).");
    }
    deja.set(cle, valeur);
    poser(obtenirSet(nomSet), t.type, nomToken, valeur);
    setsVariante.add(nomSet);
    if (ch.kind === "semantic") nbComp++; else nbSem++;
  }

  // Thème
  let theme;
  if (m.themeMode === "new") {
    const groupe = (m.themeGroup || "").trim() || "appareil";
    const nom = (m.themeName || "").trim() || suffixe;
    theme = c.themes.find((x) => x.group === groupe && x.name === nom) || c.addTheme({ group: groupe, name: nom });
    const base = new Set(m.setsSources || []);
    setsFondation.forEach((n) => base.add(n));
    const existants = c.themes.filter((x) => x.id !== theme.id);
    if (existants.length) {
      existants.map((x) => x.activeSets.map((s) => s.name))
        .reduce((a, b) => a.filter((n) => b.includes(n)))
        .forEach((n) => base.add(n));
    }
    for (const s of c.sets) if (base.has(s.name)) { try { theme.addSet(s); } catch (e) { /* déjà présent */ } }
  } else {
    theme = c.themes.find((x) => x.id === m.themeId);
    if (!theme) throw new Error("Thème introuvable.");
  }
  setsVariante.forEach((n) => { try { theme.addSet(n); } catch (e) { /* déjà présent */ } });
  if (m.activer && !theme.active) theme.toggleActive();

  const parts = [];
  if (fondationsCreees.length) parts.push(fondationsCreees.length + " fondation(s) créée(s) (" + fondationsCreees.join(", ") + ")");
  if (nbSem) parts.push(nbSem + " sémantique(s) surchargé(s)");
  if (nbComp) parts.push(nbComp + " token(s) composant surchargé(s)");
  return "Variante « " + suffixe + " » : " + parts.join(" · ") + ". Thème « " + theme.name + " ».";
}

penpot.ui.onMessage((m) => {
  if (m.type === "ready") return envoyerEtat();
  if (m.type === "appliquer") {
    try {
      const message = appliquer(m);
      penpot.ui.sendMessage({ type: "fini", ok: true, message });
      envoyerEtat();
    } catch (e) {
      penpot.ui.sendMessage({ type: "fini", ok: false, message: String(e.message || e) });
    }
  }
});

penpot.on("selectionchange", envoyerEtat);
