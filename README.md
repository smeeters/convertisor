# Component convertisor — plugin Penpot

Décline un ou plusieurs composants tokenisés (bouton, champ…) en variante tablette ou mobile, sans dupliquer les composants : le plugin crée des jeux de tokens et un thème qui les active. Respecte les 3 niveaux Fondation → Sémantique → Composants : le mode ou l'appareil vit dans le jeu, jamais dans le nom.

**Version : V3**

**Lien d'installation (manifest) :** `https://smeeters.github.io/convertisor/manifest.json`
**Dépôt (téléchargement) :** https://github.com/smeeters/convertisor

## Installation
- [ ] Déposer ces fichiers à la racine du dépôt, activer GitHub Pages (branche principale, dossier `/ (root)`)
- [ ] Dans Penpot : `Ctrl + Alt + P` → coller le lien du manifest ci-dessus → Installer
- [ ] Docker self-hosted : si le gestionnaire de plugins n'apparaît pas, ajouter `enable-plugins` à `PENPOT_FLAGS` (frontend)

## Utilisation
- [ ] Sélectionner un ou plusieurs composants
- [ ] Dans le tableau Desktop / Tablette : choisir un token sémantique ou une fondation, ou saisir une valeur libre
- [ ] Nommer la variante, choisir un nouveau thème ou un thème existant
- [ ] **Aperçu avant application** : rien n'est écrit tant qu'on n'a pas cliqué sur « Appliquer »
- [ ] Lire le **rapport de conversion**, puis « Terminer » ou « Annuler la conversion »

## Règles appliquées
| Choix | Ce qui est écrit |
|---|---|
| Sémantique existant | Token composant, même nom, dans `03-…-Variante` |
| Fondation ou valeur libre | Sémantique, même nom, dans `02-…-Variante` (fondation retrouvée ou créée dans `01-…`) |
| Typographie | Choix parmi les sémantiques uniquement (valeur composite) |

## Rapport de conversion
- Composants : converti, partiel, non converti
- Tokens manquants : introuvable, sans sémantique, lié directement à une fondation
- Valeurs fixes non converties : rayon, padding, espacement, taille de police, épaisseur de trait

## Historique
- V3 : « Utilisé par » déroulant sur chaque ligne du tableau
- V2 : tableau Desktop / Tablette, aperçu avant application, rapport de conversion, traitement par lot, annulation
- V1 : première version (variante tablette via jeu de tokens + thème)

## Limites connues
- L'annulation est possible tant que le plugin reste ouvert (un seul `Ctrl + Z` annule aussi l'écriture).
- Largeur et hauteur ne sont pas analysées comme valeurs fixes.
- Un sémantique surchargé change tous les tokens de composants qui l'utilisent ; l'aperçu le signale.
- L'activation du thème peut prendre quelques secondes sur un gros fichier : case décochée par défaut.
- Pas d'icône de plugin pour l'instant.
