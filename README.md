# FACTURATH

Free, open-source, offline-first invoice generator for Cuban businesses.
No login, no server: the app is a static site that runs entirely in the
browser and keeps your data on your device.

## Commands

```bash
npm start        # dev server at http://localhost:4200
npm test         # unit tests (Vitest through the Angular CLI)
npm run build    # production build to dist/facturath/browser
npm run deploy   # publish dist/facturath/browser to Cloudflare (needs wrangler login)
```

The production build emits plain static files with the single route
prerendered at build time.

## Deployment

The site is served by Cloudflare Workers static assets: `wrangler.jsonc`
declares only the build output directory with single-page-application
routing, and `public/_headers` sets the cache policy (hashed bundles
immutable, HTML entry and service-worker manifest never cached).

GitHub Actions (`.github/workflows/ci.yml`) runs install, tests and the
production build on every pull request; the check fails on a failing
test, a size-budget error or any build warning. On push to `main` the
same workflow also deploys the build with wrangler, so the public URL
is always the latest green build of `main`.

The workflow needs two repository secrets:

| Secret                  | Value                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | An API token created in the Cloudflare dashboard from the **Edit Cloudflare Workers** template (Workers Scripts: Edit on the account). |
| `CLOUDFLARE_ACCOUNT_ID` | The account id shown in the Workers & Pages overview of the Cloudflare dashboard.                                                      |

The first deploy creates a Worker named `facturath`; its public URL is
`https://facturath.<account-subdomain>.workers.dev` and is also shown
in the `production` environment of the repository. A custom domain is a
later step.

To deploy from a local machine instead, run `npx wrangler login` once
and then `npm run build && npm run deploy`.

## Manual checks

Printing goes through the browser print dialog (the **PDF / Imprimir**
button), so the print stylesheet is checked by hand on the browsers we
care about. Fill an invoice with 10 lines, some notes and terms, then:

**Chrome (desktop)**

- Print preview shows only the invoice: no header bar, buttons, empty
  field hints, "Acciones" column or app footer.
- The document has no border or shadow and fills the page width inside
  10 mm margins.
- The 10-line invoice fits on one A4 page; no row is cut in half.
- "Save as PDF" produces a file whose text is only the invoice (search
  it for a field hint such as "Tu nombre": nothing should match).

**Firefox (desktop)**

- Same as Chrome, except that notes and terms keep their on-screen
  height instead of growing with the text (Firefox does not support
  `field-sizing`). Text beyond that height is cut in print; drag the
  corner of the box to enlarge it before printing.

**iOS Safari**

- Share sheet → Print (or pinch out on the preview to get a PDF).
- Nothing is cut off at the right edge and the totals stay on the same
  page as the lines.

## Documentation

- [Design spec](docs/superpowers/specs/2026-09-03-facturath-v1-design.md)
- [Application layers](src/app/README.md)
