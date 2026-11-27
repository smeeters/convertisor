// Component convertisor : décline un ou plusieurs composants tokenisés en variante (tablette, mobile…)
// en respectant les 3 niveaux Fondation → Sémantique → Composants.
// Règle : l'appareil/le mode vit dans le SET, jamais dans le nom (mêmes noms que la base).
// Cycle : analyser → planifier (aperçu, aucune écriture) → appliquer (journalisé) → annuler (au besoin).

penpot.ui.open("Component convertisor", "https://smeeters.github.io/convertisor/index.html", {
  width: 640,
  height: 780,
});

const TYPES_TAILLE = [
  "spacing", "sizing", "dimension", "borderRadius",
  "borderWidth", "fontSizes", "letterSpacing", "typography",
];

// Préfixes des fondations littérales créées pour une valeur libre (suivent les motifs du fichier).
const PREFIXES_FONDATION = {
  spacing: "spacing.dense", borderRadius: "radius.dense", fontSizes: "font.size",
  borderWidth: "border.width", sizing: "sizing", dimension: "dimension", letterSpacing: "letter-spacing",
};
const nomFondation = (type, v) =>
  (PREFIXES_FONDATION[type] || type) + "." + String(v).replace(/^-/, "neg-").replace(/\./g, "-");

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

// ================================================================ 1. ANALYSE
// Index construit une seule fois par analyse : nom -> { tk, set } et sémantique -> composants consommateurs.
function indexer() {
  const byName = new Map();
  const conso = new Map();
  for (const set of cat().sets) {
    const niv = niveau(set.name);
    for (const tk of set.tokens) {
      if (!byName.has(tk.name)) byName.set(tk.name, { tk, set });
      if (niv === 3) {
        const r = refDe(tk.value);
        if (r) { if (!conso.has(r)) conso.set(r, new Set()); conso.get(r).add(tk.name); }
      }
    }
  }
  return { byName, conso };
}

function creerEntree(nom, ix) {
  const trouve = ix.byName.get(nom);
  if (!trouve || !TYPES_TAILLE.includes(trouve.tk.type)) return null;
  const { tk, set } = trouve;
  const niv = niveau(set.name);
  const e = {
    name: nom, type: tk.type, set: set.name, niveau: niv,
    valeur: typeof tk.value === "string" ? tk.value : "(composite)",
    resolu: decrire(tk), proprietes: [], composants: [],
    sem: null, semSet: null, semResolu: null, conso: 0, utilisePar: [],
  };
  if (niv === 2) { e.sem = nom; e.semSet = set.name; e.semResolu = e.resolu; }
  if (niv === 3) {
    const r = refDe(tk.value);
    const s = r && ix.byName.get(r);
    if (s && niveau(s.set.name) === 2) { e.sem = r; e.semSet = s.set.name; e.semResolu = decrire(s.tk); }
  }
  if (e.sem) { const cs = ix.conso.get(e.sem) || new Set(); e.conso = cs.size; e.utilisePar = Array.from(cs).sort(); }
  return e;
}

// Valeurs en dur : propriétés de taille d'un calque qui ne sont reliées à aucun token.
function valeursFixes(shape) {
  const t = shape.tokens || {};
  const aToken = (prefixe) => Object.keys(t).some((k) => k.startsWith(prefixe));
  const f = [];
  if (typeof shape.borderRadius === "number" && shape.borderRadius > 0 && !aToken("borderRadius")) {
    f.push({ propriete: "rayon", valeur: shape.borderRadius });
  }
  const fl = shape.flex;
  if (fl) {
    [["leftPadding", "paddingLeft", "padding gauche"], ["rightPadding", "paddingRight", "padding droit"],
     ["topPadding", "paddingTop", "padding haut"], ["bottomPadding", "paddingBottom", "padding bas"],
     ["rowGap", "rowGap", "espacement vertical"], ["columnGap", "columnGap", "espacement horizontal"]]
      .forEach(([prop, cle, lib]) => {
        if (typeof fl[prop] === "number" && fl[prop] > 0 && !t[cle]) f.push({ propriete: lib, valeur: fl[prop] });
      });
  }
  if (shape.type === "text" && shape.fontSize && !t.typography && !t.fontSizes) {
    f.push({ propriete: "taille de police", valeur: shape.fontSize });
  }
  if (Array.isArray(shape.strokes) && !t.strokeWidth) {
    const w = shape.strokes.map((s) => s.strokeWidth).find((x) => typeof x === "number" && x > 0);
    if (w) f.push({ propriete: "épaisseur de trait", valeur: w });
  }
  return f;
}

function parcourir(shape, c, ix, fusion) {
  for (const nom of Object.values(shape.tokens || {})) {
    if (!ix.byName.has(nom)) {
      cleManquant(c, nom, "introuvable", shape.name);
      continue;
    }
    if (!fusion.has(nom)) { const e = creerEntree(nom, ix); if (e) fusion.set(nom, e); }
    const e = fusion.get(nom);
    if (!e) continue; // couleur, ombre, opacité… : hors périmètre
    if (!e.composants.includes(c.id)) e.composants.push(c.id);
    if (!c.tokens.includes(nom)) c.tokens.push(nom);
    if (e.niveau === 3 && !e.sem) cleManquant(c, nom, "sans-semantique", shape.name);
    if (e.niveau === 1) cleManquant(c, nom, "fondation-directe", shape.name);
  }
  valeursFixes(shape).forEach((v) => c.fixes.push({ calque: shape.name, ...v }));
  (shape.children || []).forEach((ch) => parcourir(ch, c, ix, fusion));
}
function cleManquant(c, token, raison, calque) {
  if (!c.manquants.some((m) => m.token === token && m.raison === raison)) c.manquants.push({ token, raison, calque });
}

// Chaque calque sélectionné est un « composant » du lot.
function analyser() {
  const sel = penpot.selection;
  if (!sel.length) return null;
  const ix = indexer();
  const fusion = new Map();
  const composants = sel.map((s) => {
    const c = { id: s.id, nom: s.name, tokens: [], fixes: [], manquants: [] };
    parcourir(s, c, ix, fusion);
    return c;
  });
  return { composants, fusion, ix };
}

function etat() {
  const a = analyser();
  if (!a) return { selection: null };
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
    selection: a.composants.map((c) => c.nom).join(", "),
    composants: a.composants.map((c) => ({ id: c.id, nom: c.nom, nbTokens: c.tokens.length, nbFixes: c.fixes.length, nbManquants: c.manquants.length })),
    tokens: Array.from(a.fusion.values()),
    candidats,
    themes: cat().themes.map((t) => ({ id: t.id, group: t.group, name: t.name, active: t.active })),
  };
}
const envoyerEtat = () => penpot.ui.sendMessage({ type: "etat", ...etat() });

// ================================================================ 2. PLANIFICATION (aucune écriture)
function planifier(m) {
  const plan = { erreurs: [], avertissements: [], ops: [], fondations: [], jeux: [], theme: null, setsTheme: [], rapport: null };
  const err = (t) => plan.erreurs.push(t);
  const a = analyser();
  if (!a) { err("Aucune sélection."); return plan; }
  const suffixe = (m.variante || "").trim();
  if (!suffixe) err("Donne un nom à la variante (ex. Tablette).");
  const modifs = (m.tokens || []).filter((t) => t.choix);
  if (!modifs.length) err("Aucun token modifié.");

  const { ix } = a;
  const sets = cat().sets;
  const nomsPris = new Set(ix.byName.keys());           // pour le contrôle de collision
  const deja = new Map();                                 // jeu|token -> valeur (détecte les conflits du lot)
  const semSurcharges = new Set();
  const fondNouv = new Map();

  const collision = (nom) => {
    for (const n of nomsPris) {
      if (n !== nom && (n.startsWith(nom + ".") || nom.startsWith(n + "."))) return n;
    }
    return null;
  };

  for (const t of modifs) {
    const ch = t.choix;
    const ent = a.fusion.get(t.name);
    if (!ent) { err("« " + t.name + " » n'est plus dans la sélection."); continue; }
    let jeu, token, valeur, avant, apres;

    if (ch.kind === "semantic") {
      if (ent.niveau !== 3) { err("« " + ent.name + " » n'est pas un token de composant."); continue; }
      const r = refDe(ch.ref); const cible = r && ix.byName.get(r);
      if (!cible || niveau(cible.set.name) !== 2) { err("« " + ch.ref + " » n'est pas un token sémantique."); continue; }
      jeu = ent.set + "-" + suffixe; token = ent.name; valeur = ch.ref; avant = ent.resolu; apres = decrire(cible.tk);
    } else {
      if (!ent.sem) { err("« " + ent.name + " » ne passe pas par un sémantique : choisis un token sémantique."); continue; }
      if (ent.type === "typography") { err("« " + ent.name + " » : la typographie se choisit parmi les sémantiques."); continue; }
      let ref = ch.ref;
      if (ch.kind === "free") {
        const n = Number(ch.valeur);
        if (!Number.isFinite(n)) { err("Valeur libre invalide pour « " + ent.name + " »."); continue; }
        let exist = null;
        for (const set of sets) {
          if (niveau(set.name) !== 1) continue;
          const f = set.tokens.find((k) => k.type === ent.type && Number(k.resolvedValue) === n);
          if (f) { exist = f; break; }
        }
        const nom = exist ? exist.name : nomFondation(ent.type, n);
        if (!exist && !fondNouv.has(nom)) {
          const c = collision(nom);
          if (c) { err("Collision de nom : « " + nom + " » et « " + c + " » (un nom ne peut pas être le préfixe d'un autre)."); continue; }
          const s1 = sets.filter((s) => niveau(s.name) === 1);
          const cibleSet = s1.find((s) => s.tokens.some((k) => k.type === ent.type)) || s1[0];
          if (!cibleSet) { err("Aucun set de fondation (01-…) trouvé."); continue; }
          fondNouv.set(nom, { nom, type: ent.type, valeur: n, set: cibleSet.name, existe: false });
          nomsPris.add(nom);
        }
        ref = "{" + nom + "}"; apres = String(n);
      } else {
        const r = refDe(ref); const cible = r && ix.byName.get(r);
        if (!cible || niveau(cible.set.name) !== 1) { err("« " + ref + " » n'est pas une fondation."); continue; }
        apres = decrire(cible.tk);
      }
      jeu = ent.semSet + "-" + suffixe; token = ent.sem; valeur = ref; avant = ent.semResolu;
      semSurcharges.add(ent.sem);
      if (ent.conso > 1) {
        plan.avertissements.push("« " + ent.sem + " » est partagé par " + ent.conso + " tokens de composants : ils changeront tous en " + suffixe + ".");
      }
    }
    const cle = jeu + "|" + token;
    if (deja.has(cle) && deja.get(cle) !== valeur) {
      err("« " + token + " » reçoit deux valeurs différentes (il est partagé par plusieurs tokens ou composants du lot).");
      continue;
    }
    if (deja.has(cle)) continue;
    deja.set(cle, valeur);
    const jeuExistant = sets.find((s) => s.name === jeu);
    const existant = jeuExistant && jeuExistant.tokens.find((k) => k.name === token);
    const action = !existant ? "creer" : (JSON.stringify(existant.value) === JSON.stringify(valeur) ? "identique" : "maj");
    plan.ops.push({ jeu, token, type: ent.type, valeur, avant, apres, action, niveauCible: niveau(jeu) });
    if (!plan.jeux.includes(jeu)) plan.jeux.push(jeu);
  }
  fondNouv.forEach((f) => plan.fondations.push(f));
  plan.avertissements = Array.from(new Set(plan.avertissements));

  // Thème
  if (m.themeMode === "new") {
    const groupe = (m.themeGroup || "").trim() || "appareil";
    const nom = (m.themeName || "").trim() || suffixe;
    const ex = cat().themes.find((x) => x.group === groupe && x.name === nom);
    plan.theme = { mode: "new", groupe, nom, existe: !!ex, id: ex ? ex.id : null };
  } else {
    const ex = cat().themes.find((x) => x.id === m.themeId);
    if (!ex) err("Thème introuvable.");
    else plan.theme = { mode: "existing", groupe: ex.group, nom: ex.name, existe: true, id: ex.id };
  }
  // Jeux rattachés au thème : jeux d'origine + fondations + jeux communs aux thèmes existants + jeux de variante
  const base = new Set();
  a.fusion.forEach((e) => { if (e.set) base.add(e.set); if (e.semSet) base.add(e.semSet); });
  fondNouv.forEach((f) => base.add(f.set));
  if (plan.theme && plan.theme.mode === "new") {
    const autres = cat().themes.filter((x) => x.id !== plan.theme.id);
    if (autres.length) {
      autres.map((x) => x.activeSets.map((s) => s.name)).reduce((p, q) => p.filter((n) => q.includes(n))).forEach((n) => base.add(n));
    }
  }
  plan.setsTheme = [...Array.from(base).filter((n) => sets.some((s) => s.name === n)), ...plan.jeux];

  plan.rapport = construireRapport(a, modifs, semSurcharges, plan);
  return plan;
}

function construireRapport(a, modifs, semSurcharges, plan) {
  const modifies = new Set(modifs.map((t) => t.name));
  const composants = a.composants.map((c) => {
    const touches = c.tokens.filter((n) => {
      const e = a.fusion.get(n);
      return modifies.has(n) || (e && e.sem && semSurcharges.has(e.sem));
    });
    const probleme = c.fixes.length > 0 || c.manquants.length > 0;
    const statut = touches.length === 0 ? "non-converti" : (probleme ? "partiel" : "converti");
    return { id: c.id, nom: c.nom, statut, modifies: touches, fixes: c.fixes, manquants: c.manquants };
  });
  const compte = (s) => composants.filter((c) => c.statut === s).length;
  return {
    composants,
    resume: { total: composants.length, convertis: compte("converti"), partiels: compte("partiel"), nonConvertis: compte("non-converti") },
    fondationsCreees: plan.fondations.map((f) => f.nom),
    jeux: plan.jeux,
    theme: plan.theme,
  };
}

// ================================================================ 3. APPLICATION JOURNALISÉE
let dernierJournal = null;

function obtenirSet(nom, journal) {
  const ex = cat().sets.find((s) => s.name === nom);
  if (ex) return ex;
  const s = cat().addSet({ name: nom });
  journal.push({ t: "set-cree", nom });
  return s;
}

function executer(plan, activer, journal) {
  for (const f of plan.fondations) {
    const set = cat().sets.find((s) => s.name === f.set);
    set.addToken({ type: f.type, name: f.nom, value: String(f.valeur) });
    journal.push({ t: "token-cree", set: f.set, nom: f.nom });
  }
  for (const op of plan.ops) {
    const set = obtenirSet(op.jeu, journal);
    const ex = set.tokens.find((k) => k.name === op.token);
    if (ex) {
      if (op.action !== "identique") { journal.push({ t: "token-maj", set: op.jeu, nom: op.token, ancienne: ex.value }); ex.value = op.valeur; }
    } else {
      set.addToken({ type: op.type, name: op.token, value: op.valeur });
      journal.push({ t: "token-cree", set: op.jeu, nom: op.token });
    }
  }
  let theme;
  if (plan.theme.mode === "new") {
    theme = cat().themes.find((x) => x.group === plan.theme.groupe && x.name === plan.theme.nom);
    if (!theme) { theme = cat().addTheme({ group: plan.theme.groupe, name: plan.theme.nom }); journal.push({ t: "theme-cree", id: theme.id }); }
  } else {
    theme = cat().themes.find((x) => x.id === plan.theme.id);
  }
  const dejaDans = new Set(theme.activeSets.map((s) => s.name));
  for (const n of plan.setsTheme) {
    if (dejaDans.has(n)) continue;
    const s = cat().sets.find((x) => x.name === n);
    if (!s) continue;
    theme.addSet(s);                               // Penpot 2.17 : l'objet jeu est exigé, pas son nom
    journal.push({ t: "theme-set", themeId: theme.id, nom: n });
  }
  if (activer && !theme.active) { theme.toggleActive(); journal.push({ t: "theme-active", themeId: theme.id }); }
}

function annulerJournal(journal) {
  const c = cat();
  for (const j of journal.slice().reverse()) {
    try {
      if (j.t === "theme-active") { const th = c.themes.find((x) => x.id === j.themeId); if (th && th.active) th.toggleActive(); }
      else if (j.t === "theme-set") { const th = c.themes.find((x) => x.id === j.themeId); const s = c.sets.find((x) => x.name === j.nom); if (th && s) th.removeSet(s); }
      else if (j.t === "token-maj") { const s = c.sets.find((x) => x.name === j.set); const k = s && s.tokens.find((t) => t.name === j.nom); if (k) k.value = j.ancienne; }
      else if (j.t === "token-cree") { const s = c.sets.find((x) => x.name === j.set); const k = s && s.tokens.find((t) => t.name === j.nom); if (k) k.remove(); }
      else if (j.t === "set-cree") { const s = c.sets.find((x) => x.name === j.nom); if (s && s.tokens.length === 0) s.remove(); }
      else if (j.t === "theme-cree") { const th = c.themes.find((x) => x.id === j.id); if (th) th.remove(); }
    } catch (e) { /* on continue : mieux vaut défaire le maximum */ }
  }
}

function appliquer(m) {
  const plan = planifier(m);
  if (plan.erreurs.length) throw new Error(plan.erreurs[0]);
  const journal = [];
  let bloc = null;
  try { bloc = penpot.history.undoBlockBegin(); } catch (e) { /* facultatif */ }
  try {
    executer(plan, m.activer, journal);
  } catch (e) {
    annulerJournal(journal);                       // retour arrière complet si l'écriture échoue en route
    throw new Error("Écriture interrompue, tout a été annulé : " + (e.message || e));
  } finally {
    try { if (bloc) penpot.history.undoBlockFinish(bloc); } catch (e) { /* facultatif */ }
  }
  dernierJournal = journal;
  return plan.rapport;
}

function annuler() {
  if (!dernierJournal) throw new Error("Rien à annuler.");
  let bloc = null;
  try { bloc = penpot.history.undoBlockBegin(); } catch (e) { /* facultatif */ }
  try { annulerJournal(dernierJournal); } finally { try { if (bloc) penpot.history.undoBlockFinish(bloc); } catch (e) { /* facultatif */ } }
  dernierJournal = null;
}

// ================================================================ messages
penpot.ui.onMessage((m) => {
  if (m.type === "ready") return envoyerEtat();
  try {
    if (m.type === "planifier") penpot.ui.sendMessage({ type: "plan", plan: planifier(m) });
    if (m.type === "appliquer") {
      const rapport = appliquer(m);
      penpot.ui.sendMessage({ type: "fini", ok: true, rapport, annulable: true });
      envoyerEtat();
    }
    if (m.type === "annuler") {
      annuler();
      penpot.ui.sendMessage({ type: "annule", ok: true });
      envoyerEtat();
    }
  } catch (e) {
    penpot.ui.sendMessage({ type: m.type === "annuler" ? "annule" : "fini", ok: false, message: String(e.message || e) });
  }
});

penpot.on("selectionchange", envoyerEtat);
