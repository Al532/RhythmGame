# RhythmGame

## Asset versioning convention

Le cache-busting est manuel et repose sur un numéro de version numérique en dur dans les URLs d'assets.

- Dans `index.html`, tous les assets runtime JS/CSS doivent être appelés avec le même suffixe `?v=<nombre>` (ex: `style.css?v=36`, `main.js?v=36`, `fx-webgl.js?v=36`).
- Dans `main.js`, l'import dynamique de `fx-webgl.js` doit utiliser la même version numérique en dur pour rester aligné avec le HTML.
- `window.APP_VERSION` conserve la même valeur (ici `42`) pour l'affichage utilisateur de la build.
- À chaque modification runtime JS/CSS, il faut incrémenter ce numéro partout dans le HTML (et dans l'import dynamique) pour forcer GitHub Pages et mobile à recharger les assets frais.
