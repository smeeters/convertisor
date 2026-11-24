const params = new URLSearchParams(location.search);
  document.body.dataset.theme = params.get("theme") || "light";
  const $ = (id) => document.getElementById(id);
  let etat = null;

  function option(valeur, texte) {
    const o = document.createElement("option");
    o.value = valeur; o.textContent = texte; return o;
  }

  function rendre() {
    const vide = !etat || !etat.selection;
    $("vide").hidden = !vide;
    $("app").hidden = vide;
    if (vide) return;

    $("sel").textContent = etat.selection;
    const liste = $("liste");
    // On garde les choix en cours si la sélection n'a pas changé de tokens.
    const memo = {};
    liste.querySelectorAll(".ligne").forEach((l) => {
      memo[l.dataset.name] = { ref: l.querySelector("select").value, val: l.querySelector("input").value };
    });
    liste.textContent = "";
    $("aucun").hidden = etat.tokens.length > 0;

    for (const t of etat.tokens) {
      const l = document.createElement("div");
      l.className = "ligne"; l.dataset.name = t.name; l.dataset.type = t.type;
      const n = document.createElement("div"); n.className = "nom"; n.textContent = t.name;
      const a = document.createElement("div"); a.className = "actuel";
      a.textContent = t.type + " · actuel : " + t.resolu + "  (" + t.valeur + ")";
      const c = document.createElement("div"); c.className = "champs";
      const s = document.createElement("select");
      s.appendChild(option("", "— inchangé —"));
      (etat.candidats[t.type] || []).forEach((k) => {
        if (k.name !== t.name) s.appendChild(option("{" + k.name + "}", k.name + "  (" + k.resolu + ")"));
      });
      const i = document.createElement("input");
      i.type = "number"; i.placeholder = "valeur libre";
      if (t.type === "typography") i.disabled = true;
      const m = memo[t.name];
      if (m) { s.value = m.ref; i.value = m.val; }
      c.append(s, i);
      l.append(n, a, c);
      liste.appendChild(l);
    }

    const ex = $("themeExistant");
    ex.textContent = "";
    etat.themes.forEach((th) => ex.appendChild(option(th.id, (th.group ? th.group + " / " : "") + th.name)));
  }

  document.querySelectorAll("input[name=mode]").forEach((r) =>
    r.addEventListener("change", () => {
      const nouveau = document.querySelector("input[name=mode]:checked").value === "new";
      $("themeGroup").disabled = !nouveau; $("themeName").disabled = !nouveau;
      $("themeExistant").disabled = nouveau;
    })
  );

  $("go").addEventListener("click", () => {
    const tokens = [];
    $("liste").querySelectorAll(".ligne").forEach((l) => {
      const ref = l.querySelector("select").value;
      const val = l.querySelector("input").value;
      const valeur = val !== "" ? val : ref;
      if (valeur) tokens.push({ name: l.dataset.name, type: l.dataset.type, value: valeur });
    });
    // Jeux de base du thème : ceux qui contiennent les tokens d'origine.
    const setsSources = Array.from(new Set(etat.tokens.map((t) => t.set)));
    const mode = document.querySelector("input[name=mode]:checked").value;
    $("go").disabled = true;
    parent.postMessage({
      type: "appliquer",
      setName: $("nomSet").value.trim(),
      tokens,
      themeMode: mode,
      themeGroup: $("themeGroup").value.trim(),
      themeName: $("themeName").value.trim(),
      themeId: $("themeExistant").value,
      activer: $("activer").checked,
      setsSources,
    }, "*");
  });

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || !m.type) return;
    if (m.type === "etat") { etat = m; rendre(); }
    if (m.type === "fini") {
      $("go").disabled = false;
      const box = $("msg");
      box.className = m.ok ? "ok" : "ko";
      box.textContent = m.message;
    }
  });

  parent.postMessage({ type: "ready" }, "*");
