# RhythmGame

## Asset versioning convention

`window.APP_VERSION` in `index.html` must be updated on every frontend code change (HTML/CSS/JS), in the same commit.

Format required: UTC timestamp `YYYYMMDDHHmmss` (example: `20260219140728`).

This value is used for cache busting via query params on static assets (for example `style.css?v=...` and `main.js?v=...`).
