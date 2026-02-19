# RhythmGame

## Asset versioning convention

Asset versions are now resolved automatically at runtime in `index.html`.

For each static asset (`style.css`, `main.js`), the loader uses `HEAD` metadata in this order:

1. `etag`
2. `last-modified`
3. fallback `Date.now()` when metadata is unavailable

This guarantees cache-busting query params (`?v=...`) even when only CSS (or another single asset) changes, without manually editing a global version string.
