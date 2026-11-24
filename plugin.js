// Component convertisor : décline un composant tokenisé via un jeu de tokens + un thème.

penpot.ui.open("Component convertisor", "ui.html?theme=" + penpot.theme, {
  width: 460,
  height: 680,
});

// Types de tokens liés aux tailles (les couleurs et ombres sont ignorées).
const TYPES_TAILLE = [
  "spacing",
  "sizing",
  "dimension",
  "borderRadius",
  "borderWidth",
  "fontSizes",
  "letterSpacing",
  "typography",
];

const catalogue = () => penpot.library.local.tokens;

function decrire(tk) {
  const r = tk.resolvedValue;
  if (r === undefined || r === null) return "?";
  if (Array.isArray(r) && typeof r[0] === "object") {
    const t = r[0];
    return [t.fontSizes ? t.fontSizes + "px" : null, t.fontWeights ? "w" + t.fontWeights : null]
      .filter(Boolean)
      .join(" ");
  }
  return String(r);
}

function trouverToken(nom) {
  for (const set of catalogue().sets) {
    for (const tk of set.tokens) {
      if (tk.name === nom) return { tk, set };
    }
  }
  return null;
}

function parcourir(shape, acc) {
  if (shape.tokens) {
    for (const [prop, nom] of Object.entries(shape.tokens)) {
      const trouve = trouverToken(nom);
      if (!trouve || !TYPES_TAILLE.includes(trouve.tk.type)) continue;
      if (!acc.has(nom)) {
        acc.set(nom, {
          name: nom,
          type: trouve.tk.type,
          set: trouve.set.name,
          valeur: typeof trouve.tk.value === "string" ? trouve.tk.value : "(composite)",
          resolu: decrire(trouve.tk),
          proprietes: [],
        });
      }
      const entree = acc.get(nom);
      if (!entree.proprietes.includes(prop)) entree.proprietes.push(prop);
    }
  }
  if (shape.children) shape.children.forEach((c) => parcourir(c, acc));
}

function etat() {
  const sel = penpot.selection;
  if (!sel.length) return { selection: null };
  const acc = new Map();
  sel.forEach((s) => parcourir(s, acc));
  const cat = catalogue();
  const candidats = {};
  for (const set of cat.sets) {
    for (const tk of set.tokens) {
      if (!TYPES_TAILLE.includes(tk.type)) continue;
      (candidats[tk.type] = candidats[tk.type] || []).push({
        name: tk.name,
        resolu: decrire(tk),
      });
    }
  }
  return {
    selection: sel.map((s) => s.name).join(", "),
    tokens: Array.from(acc.values()),
    candidats,
    themes: cat.themes.map((t) => ({ id: t.id, group: t.group, name: t.name, active: t.active })),
    sets: cat.sets.map((s) => s.name),
  };
}

function envoyerEtat() {
  penpot.ui.sendMessage({ type: "etat", ...etat() });
}

function appliquer(m) {
  const cat = catalogue();
  if (!m.setName) throw new Error("Donne un nom au jeu de tokens.");
  if (cat.sets.some((s) => s.name === m.setName)) {
    throw new Error("Un jeu « " + m.setName + " » existe déjà. Choisis un autre nom.");
  }
  if (!m.tokens.length) throw new Error("Aucun token modifié.");
  if (m.themeMode === "new" && !m.themeName) throw new Error("Donne un nom au thème.");

  const set = cat.addSet({ name: m.setName });
  for (const t of m.tokens) {
    set.addToken({ type: t.type, name: t.name, value: t.value });
  }

  let theme;
  if (m.themeMode === "new") {
    theme = cat.addTheme({ group: m.themeGroup || "", name: m.themeName });
    // Le nouveau thème reprend les jeux d'origine des tokens, plus les jeux communs
    // à tous les thèmes existants (ex. fondations), mais pas les jeux de mode (Dark/Light).
    const base = new Set(m.setsSources);
    const existants = cat.themes.filter((t) => t.id !== theme.id);
    if (existants.length) {
      const communs = existants
        .map((t) => t.activeSets.map((s) => s.name))
        .reduce((a, b) => a.filter((n) => b.includes(n)));
      communs.forEach((n) => base.add(n));
    }
    for (const s of cat.sets) {
      if (base.has(s.name)) theme.addSet(s);
    }
  } else {
    theme = cat.themes.find((t) => t.id === m.themeId);
    if (!theme) throw new Error("Thème introuvable.");
  }
  theme.addSet(set);
  if (m.activer && !theme.active) theme.toggleActive();
  return "Jeu « " + m.setName + " » créé (" + m.tokens.length + " tokens), rattaché au thème « " + theme.name + " ».";
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
