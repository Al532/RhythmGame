# RhythmGame

## Asset versioning convention

Le cache-busting est piloté par une seule constante globale `window.APP_VERSION` définie dans `index.html`.

- Tous les assets runtime JS/CSS déclarés avec `data-asset` passent par `window.withAppVersion(assetPath)` pour injecter automatiquement `?v=${encodeURIComponent(window.APP_VERSION)}`.
- Cette convention couvre `style.css`, `main.js`, `fx-webgl.js`, et `fx.css` si ce fichier est ajouté plus tard.
- `main.js` lit la même valeur (`window.APP_VERSION`) pour afficher la version sur l'écran de démarrage et pour importer `fx-webgl.js` avec le même cache-busting.
- À chaque modification runtime JS/CSS, il faut incrémenter `window.APP_VERSION` dans `index.html` pour forcer GitHub Pages (et les navigateurs) à charger les assets frais.
