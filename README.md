# Component convertisor — plugin Penpot

Décline un composant tokenisé (bouton, champ…) en variante tablette ou mobile, sans dupliquer le composant : le plugin crée un jeu de tokens et un thème qui l'active.

## Installation
- [ ] Node.js ≥ 18
- [ ] `npm run build` → génère `dist/`
- [ ] `npm start` → construit puis sert `dist/` sur http://localhost:4400 (avec CORS)
- [ ] Dans Penpot : `Ctrl + Alt + P` → coller `http://localhost:4400/manifest.json` → Installer
- [ ] Docker self-hosted : si le gestionnaire de plugins n'apparaît pas, ajouter `enable-plugins` à `PENPOT_FLAGS` (frontend)

## Utilisation
- [ ] Sélectionner le composant (ex. `Button / Contained`)
- [ ] Pour chaque token de taille : choisir un token des fondations ou saisir une valeur
- [ ] Nommer le jeu de tokens (ex. `03-Composants-Tablette`)
- [ ] Créer un nouveau thème (groupe + nom) ou choisir un thème existant
- [ ] Cliquer sur « Créer la variante »

## Ce qui est lu
Tokens de taille : spacing, sizing, dimension, borderRadius, borderWidth, fontSizes, letterSpacing, typography. Les couleurs et ombres sont ignorées.

## Limites connues
- Un nouveau thème reprend les jeux d'origine des tokens et les jeux communs à tous les thèmes existants.
- Le jeu garde les mêmes noms de tokens que l'original : il doit rester placé après lui pour le surcharger.
- Hauteur et padding vertical : à tokeniser dans le composant avant de les décliner.
- Pas d'icône pour l'instant (`src/icon.png`).
