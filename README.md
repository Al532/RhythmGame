# RhythmGame

## Asset versioning convention

Le cache-busting est piloté par une seule constante globale `APP_VERSION` définie dans `index.html`.

- `window.APP_VERSION` est injectée automatiquement dans les URLs de `style.css` et `main.js` via `?v=...`.
- `main.js` lit la même valeur (`window.APP_VERSION`) pour afficher la version sur la page de démarrage.
- À chaque modification runtime JS/CSS, il faut incrémenter `window.APP_VERSION` dans `index.html` pour forcer GitHub Pages (et les navigateurs) à charger les assets frais.
