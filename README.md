# FACTURATH

Free, open-source, offline-first invoice generator for Cuban businesses.
No login, no server: the app is a static site that runs entirely in the
browser and keeps your data on your device.

## Commands

```bash
npm start        # dev server at http://localhost:4200
npm test         # unit tests (Vitest through the Angular CLI)
npm run build    # production build to dist/facturath/browser
```

The production build emits plain static files with the single route
prerendered at build time.

## Documentation

- [Design spec](docs/superpowers/specs/2026-09-03-facturath-v1-design.md)
- [Application layers](src/app/README.md)
