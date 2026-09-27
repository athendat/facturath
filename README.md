# FACTURATH

Free, open-source, offline-first invoice generator for Cuban businesses.
No login and no invoice ever leaves the device: the app is a static site
that runs entirely in the browser and keeps your data there. The only
thing sent anywhere is a set of anonymous usage counters (see below),
which the user can turn off.

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

The public URL is **https://facturath.athendat.site**. The first deploy
creates a Worker named `facturath` and attaches that custom domain
(`routes` in `wrangler.jsonc`), which needs the `athendat.site` zone on
the same Cloudflare account and the API token scoped to it. The
`workers.dev` and preview URLs are turned off so search engines only
see one copy of the site; a path that is not a file gets
`public/404.html` with a 404 status.

## Usage counters

To know how many devices use FACTURATH and how many invoices it issues,
the app counts, per local day and with no identifier (#76):

| Event          | Counted                                          |
| -------------- | ------------------------------------------------ |
| `install`      | first open in a browser                          |
| `active-day`   | first open of the day                            |
| `active-month` | first open of the month                          |
| `invoice`      | first print of each invoice (reprints not counted) |
| `save`         | each successful Guardar                          |

`core/usage-stats.ts` keeps the counts in localStorage (key
`facturath.usage`) until `POST /api/usage` accepts them, so offline use
is counted too. The invoice ids that stop reprints from counting stay on
the device. The setting "Enviar estadísticas anónimas de uso" in Ajustes
turns it off; it starts off when the browser sends Global Privacy
Control. The rules both sides share live in `domain/usage.ts`.

The only server code is `src/worker/`: wrangler's `run_worker_first`
sends it `/api/*` alone, it checks the request is a small same-origin
POST, and it adds the counts to the `counts` table of the
`facturath-stats` D1 database: one row per day and event, never one per
device. It reads no IP, and Worker observability is off so no request
log exists.

The tables are created by the migrations in `migrations/`:

```bash
npx wrangler d1 migrations apply facturath-stats --remote
```

To read the totals:

```bash
# Devices active per month and invoices issued per month
npx wrangler d1 execute facturath-stats --remote --command "SELECT substr(day, 1, 7) AS month, event, SUM(n) AS total FROM counts WHERE event IN ('active-month', 'invoice', 'install') GROUP BY month, event ORDER BY month, event"

# Daily active devices over the last 30 days
npx wrangler d1 execute facturath-stats --remote --command "SELECT day, n FROM counts WHERE event = 'active-day' AND day >= date('now', '-30 days') ORDER BY day"
```

Counts are per browser, not per person: one person on a phone and a
computer counts twice, and clearing site data counts as a new install.

### Protecting the counters

The endpoint is anonymous by design, so anyone can post made-up counts.
The table holds no personal data and has no read endpoint; the risk is
quota. On the Workers Free plan D1 stops **every** database of the
account once the account passes its daily row-write limit, until
midnight UTC. Three layers keep `/api/usage` from getting there (#78):

1. **Per report**: same-origin POST only, body under 8 KB, each day and
   event capped (`USAGE_DAILY_CAPS` in `domain/usage.ts`).
2. **Per IP, at the edge**: a rate-limiting rule set by hand in the
   Cloudflare dashboard (zone `athendat.site` → Security rules → Create
   rule → Rate limiting rule), matching
   `(http.host eq "facturath.athendat.site" and http.request.uri.path eq "/api/usage" and http.request.method eq "POST")`,
   5 requests per 10 seconds per IP, action Block for 10 seconds (the
   Free plan allows one rule, IP only, 10-second period and block). The
   app treats the 429 as a temporary failure and keeps its counts.
3. **Per day, in the Worker**: `daily_intake` records the reports and
   rows accepted per UTC day. A report that would pass
   `USAGE_DAILY_ROW_BUDGET` (`vars` in `wrangler.jsonc`, 20 000) writes
   nothing and gets `503` with `Retry-After`; devices keep their counts
   and send them another day, within the 60-day window.

To spot made-up traffic, compare reports with what they carried:

```bash
npx wrangler d1 execute facturath-stats --remote --command "SELECT i.day, i.reports, i.rows, SUM(CASE WHEN c.event = 'install' THEN c.n END) AS installs, SUM(CASE WHEN c.event = 'invoice' THEN c.n END) AS invoices FROM daily_intake i LEFT JOIN counts c ON c.day = i.day GROUP BY i.day ORDER BY i.day DESC LIMIT 30"
```

`daily_intake` is keyed by the UTC day the server received the reports;
`counts` by the local day on the device, so the join is a rough guide.
A day with far more reports or installs than usual, or installs with no
invoices, is worth a look. Back the table up now and then with
`npx wrangler d1 export facturath-stats --remote --output stats.sql`.

## Search engines

Everything a crawler reads is static and costs no JavaScript: the head
tags and JSON-LD in `src/index.html`, the About section after
`<app-root>` in the same file (the page's only `h1`), and
`public/robots.txt`, `public/sitemap.xml`, `public/og-image.png` and
`public/404.html`. `src/app/index-html.spec.ts` keeps the Res. 55 list
in step with `domain/compliance.ts` and the FAQ JSON-LD in step with
the visible FAQ. After a deploy that changes any of it, check the page
in Google's Rich Results Test and the link preview in a chat app.

To deploy from a local machine instead, run `npx wrangler login` once
and then `npm run build && npm run deploy`.

## Manual checks

Printing goes through the browser print dialog (the **PDF / Imprimir**
button), so the print stylesheet is checked by hand on the browsers we
care about. Fill an invoice with 10 lines, some notes and terms, then:

**Chrome (desktop)**

- Print preview shows only the invoice: no header bar, buttons, empty
  field hints, "Acciones" column or app footer.
- Leave the dialog margins on "Default" so the 10 mm page margin from the
  stylesheet applies. The document has no border or shadow and fills the
  page width inside those margins.
- The 10-line invoice fits on one A4 page; no row is cut in half.
- "Save as PDF" produces a file whose text is only the invoice (search
  it for a field hint such as "Tu nombre": nothing should match).

**Firefox (desktop)**

- Same as Chrome, except that notes and terms keep their on-screen
  height instead of growing with the text (Firefox does not support
  `field-sizing`). Text beyond that height is cut in print; drag the
  corner of the box to enlarge it before printing.
- "Save to PDF" produces a file whose text is only the invoice (search
  it for a field hint such as "Tu nombre": nothing should match).

**iOS Safari**

- Share sheet → Print (or pinch out on the preview to get a PDF).
- Nothing is cut off at the right edge and the totals stay on the same
  page as the lines.

## Documentation

- [Design spec](docs/superpowers/specs/2026-09-03-facturath-v1-design.md)
- [Application layers](src/app/README.md)
