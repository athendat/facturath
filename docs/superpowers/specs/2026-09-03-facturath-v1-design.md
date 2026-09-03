# FACTURATH v1 — Design Spec

Date: 2026-09-03
Status: approved in brainstorming, pending implementation plan
Design source: Claude Design project `76404142-072c-4ea6-a956-bcb18486cb3e`, file `FACTURATH.dc.html`

## Problem Statement

Small businesses and self-employed workers in Cuba must issue invoices that carry the data required by Resolución 55/2021 of the Ministerio de Finanzas y Precios. Today they do it in Word, Excel, or by hand. Those documents are slow to produce, easy to get wrong, do not number themselves, and do not remember the seller's own data between invoices. Existing online invoice tools require an account, a server, a stable connection, and often a paid plan, none of which fit a market with intermittent connectivity and little appetite for subscriptions.

ATHENDAT wants a free, open-source entry point that solves the invoice problem completely on its own, and that naturally introduces users to BALANC, the paid product, when they outgrow it.

## Solution

FACTURATH is a single-page web application that opens directly on an editable invoice. The user types straight into the document, sees line amounts and totals update as they type, and prints or saves to PDF through the browser. The seller's profile, logo, and payment QR codes are remembered on the device. Saved invoices live in a local history with automatic per-series numbering. Everything is stored in the browser: no login, no server, no data leaves the device. The app installs as a PWA and works fully offline after the first visit.

The document shows live which of the 13 data points required by Res. 55/2021 are still missing, without ever blocking the user from printing. Invoices can be exported and imported as JSON so users can move them between devices or hand them to an accountant.

Distribution is free: static files on Cloudflare Workers, deployed from GitHub Actions. A single discreet line in the app footer points to BALANC.

## User Stories

### Editing an invoice

1. As a seller, I want to open the app and land on a blank invoice with my own data already filled in, so that I can start typing the buyer and the items immediately.
2. As a seller, I want to edit every field directly on the document, so that what I see on screen is what will be printed.
3. As a seller, I want the invoice number to be assigned automatically as the next number in the current series, so that I never repeat or skip a number.
4. As a seller, I want to change the series letter, so that I can keep separate sequences for different kinds of sales.
5. As a seller, I want today's date pre-filled as the issue date and be able to change it, so that back-dated or forward-dated invoices are possible.
6. As a seller, I want to pick the currency among CUP, MLC, USD, and EUR, so that the invoice states the currency of payment.
7. As a seller, I want to enter an exchange rate when the currency is not CUP and see the CUP equivalent of the total, so that the buyer knows both amounts.
8. As a seller, I want to write a free-text concept of the operation, so that the invoice states what the transaction is.
9. As a seller, I want to fill in the buyer's name, address, NIT, identity card, commercial registry, and bank account, so that the invoice carries the buyer data the regulation requires.
10. As a seller, I want to add as many line items as I need, each with code, description, extended detail, unit of measure, quantity, and unit price, so that the invoice itemizes what was sold.
11. As a seller, I want the line amount to update as soon as I change quantity or price, so that I can check figures while typing.
12. As a seller, I want to type decimal numbers with either a comma or a point, so that the app accepts the way I naturally write numbers.
13. As a seller, I want to delete a line, so that I can correct mistakes.
14. As a seller, I want the last remaining line to reset to empty instead of disappearing, so that the table never becomes empty.
15. As a seller, I want to enter a discount amount, a shipping amount, and one tax with a name and a percentage, so that the totals reflect the real deal.
16. As a seller, I want subtotal, tax, and total to update instantly as I edit, so that I never have to press a calculate button.
17. As a seller, I want money to be rounded to cents consistently, so that the printed invoice never shows floating-point artifacts.
18. As a seller, I want to write notes and payment terms, so that the buyer receives delivery, warranty, or payment conditions.
19. As a seller, I want an optional carrier block with name, identity card, plate, waybill, and railway box, so that invoices for transported goods carry the carrier data the regulation asks for.
20. As a seller, I want an optional signatures block for who delivers, who receives, the carrier, and who books the invoice, so that the printed document has signature lines.
21. As a seller, I want the legal footer referencing Res. 55/2021 printed on every invoice, so that the document states its legal basis.
22. As a seller, I want the header to show the current reference and total, so that I always know which invoice I am working on.

### Seller profile and payments

23. As a seller, I want my name, address, NIT, commercial registry, bank account, and bank branch to be remembered on the device, so that I only type them once.
24. As a seller, I want to upload my logo and see it on the invoice, so that the document looks like it comes from my business.
25. As a seller, I want to upload my Transfermóvil and EnZona payment QR codes and have them printed on the invoice, so that buyers can pay by scanning.
26. As a seller, I want the logo and QR codes to be shared by all invoices rather than uploaded each time, so that setup happens once.
27. As a seller, I want to remove a logo or QR code, so that I can replace or drop it.
28. As a seller, I want a settings panel where I can edit my profile, images, and layout preferences in one place, so that setup is easy to find.

### Layout preferences

29. As a seller, I want to choose between a compact and a spacious layout, so that long invoices fit on one page and short ones look balanced.
30. As a seller, I want to hide the carrier block, the signatures block, and the payment QR block, so that invoices only show sections I use.
31. As a seller, I want these preferences remembered on the device, so that every new invoice uses my layout.

### Compliance

32. As a seller, I want to see the list of the 13 data points required by Res. 55/2021, so that I know what a legal invoice must contain.
33. As a seller, I want each data point marked as fulfilled or pending based on what I have typed, so that I know what is missing before printing.
34. As a seller, I want a counter of pending data points visible in the header, so that I notice omissions without opening the panel.
35. As a seller, I want to click a pending data point and have the app focus the corresponding field, so that fixing it is one click away.
36. As a seller, I want to be able to print even with pending data points, so that the app never blocks my business.
37. As a seller, I want optional sections that I have hidden to not count as pending, so that the checklist reflects my configuration.

### Printing

38. As a seller, I want to print the invoice or save it as PDF through the browser's print dialog, so that I get a clean A4/Letter document without extra software.
39. As a seller, I want app controls, placeholders, and empty upload boxes hidden in print, so that the PDF contains only the invoice.
40. As a seller, I want my logo and QR codes to print with correct colors, so that the QR codes remain scannable.
41. As a seller, I want the printed invoice to fit within page margins, so that nothing is cut off.

### Saving and history

42. As a seller, I want to save the current invoice to a local history, so that I can find it later.
43. As a seller, I want saving an invoice with the same series and number to replace the previous one, so that corrections do not create duplicates.
44. As a seller, I want a confirmation toast after saving, so that I know the action succeeded.
45. As a seller, I want a panel listing saved invoices with reference, buyer, date, and total, so that I can browse my history.
46. As a seller, I want to open a saved invoice back into the editor, so that I can reprint or amend it.
47. As a seller, I want to delete a saved invoice, so that I can clean up mistakes.
48. As a seller, I want the history to show how many invoices are saved, so that I get a sense of volume at a glance.
49. As a seller, I want a "new invoice" action that clears the buyer, lines, and totals but keeps my profile, date, currency, and next number, so that starting the next invoice is instant.
50. As a seller, I want the invoice I am editing to be autosaved as a draft, so that closing the tab by accident does not lose my work.
51. As a seller, I want the draft restored when I reopen the app, so that I continue where I left off.
52. As a seller, I want to be told clearly if the browser cannot store data (for example in a private window), so that I do not assume something was saved when it was not.
53. As a seller, I want to be told if storage is full, so that I can export and delete old invoices.

### Export and import

54. As a seller, I want to export the current invoice as a JSON file that includes the images, so that the file is self-contained and portable.
55. As a seller, I want to export a full backup with all saved invoices and my profile, so that I can move to another device or browser.
56. As a seller, I want to import a single invoice JSON to replace the one I am editing, so that I can continue work started elsewhere.
57. As a seller, I want to import a backup that merges into my history without deleting what I already have, so that restoring is safe.
58. As a seller, I want imports from older versions of the app to be upgraded automatically, so that old files keep working.
59. As a seller, I want a clear error when a file is not a valid FACTURATH export, so that I know why nothing happened.

### Installation and offline use

60. As a seller, I want the app to load in well under two seconds on a modest connection, so that issuing an invoice is faster than opening Word.
61. As a seller, I want to install the app on my phone or desktop, so that it opens like a native app.
62. As a seller, I want the app to work with no connection after the first visit, so that I can invoice anywhere.
63. As a seller, I want to be told when a new version is available and choose when to reload, so that an update never interrupts an invoice in progress.

### Privacy and trust

64. As a seller, I want to use the app without creating an account, so that there is no friction and no data collection.
65. As a seller, I want assurance that my invoices never leave my device, so that I trust the tool with customer data.
66. As a seller, I want no analytics or tracking scripts, so that the app stays private and fast.

### Accessibility

67. As a keyboard user, I want to move through every field with Tab and operate panels with Escape, so that the app is usable without a mouse.
68. As a screen reader user, I want every inline field to announce what it is, so that an unlabeled document is still navigable.
69. As a user with low vision, I want text and controls to meet WCAG AA contrast, so that the document is readable.

### Business

70. As ATHENDAT, I want a single discreet footer line pointing to BALANC outside the print area, so that users who need more know where to go without being nagged.
71. As ATHENDAT, I want the codebase to be open source and free to host, so that the tool costs nothing to run.
72. As a contributor, I want a feature-based structure with a pure domain layer, so that I can understand and change one part without reading everything.
73. As ATHENDAT, I want the domain layer free of framework dependencies, so that BALANC can reuse the invoice rules.
74. As ATHENDAT, I want the storage layer behind ports, so that a future sync to BALANC is an adapter, not a rewrite.

## Implementation Decisions

### Platform and build

- Angular 22, zoneless, standalone components, signals for all state. No NgRx, no Material, no Tailwind, no PDF library.
- The scaffold's server-side rendering runtime is removed. Build output is static with the single route prerendered at build time. Express and the server entry are deleted; `@angular/ssr` stays only as a build-time prerender dependency.
- Browser-only work (reading storage, creating object URLs) runs after first render so the prerendered HTML never diverges from the client DOM.
- Size budgets tightened: initial bundle warns at 250 kB and fails at 300 kB uncompressed.
- No custom fonts are shipped. The Helvetica Neue LT Std OTF files in the design are commercially licensed and are excluded. The font stack is Helvetica Neue, Helvetica, Arial, system-ui, sans-serif.
- Styling is plain CSS using the ATHENDAT design-system tokens (gem indigo primary, cool grays, 2 px radius, 1 px gray-200 borders). Design-time inline styles are ported to component styles.
- UI copy is Spanish only, kept in templates. No i18n framework. Code, identifiers, comments, docs, and commits are in English.

### Architecture

Four layers, each a top-level folder under the app source:

- **domain**: pure TypeScript with no Angular imports. Invoice model, money parsing and rounding, totals, per-series numbering, Res. 55/2021 required-field rules, formatting via `Intl` with `es-CU`, schema versioning and migrations.
- **core**: storage ports and their adapters, injection tokens, the toast service, the service-worker update notifier.
- **features**: one folder per feature: `invoice-editor`, `saved-invoices`, `settings`, `compliance`, `import-export`. Each has a store (signals) and its components. Features do not import each other's internals; they share state only through stores in `core` or through the domain.
- **shared/ui**: tiny presentational pieces: inline input, drawer, dialog, toast host, icon buttons.

Single route `/` renders the editor. Saved invoices, settings, and compliance are panels layered over the editor, not routes.

### Domain model

- `Invoice`: `id`, `schemaVersion`, `series`, `number`, `issueDate` (ISO `YYYY-MM-DD`), `currency` (`CUP` | `MLC` | `USD` | `EUR`), `exchangeRate` (to CUP, used when currency is not CUP), `concept`, `seller`, `buyer`, `lines[]`, `discount`, `shipping`, `tax` (`name`, `percent`), `notes`, `terms`, `carrier`, `signatures`, `logoAssetId`, `transfermovilQrAssetId`, `enzonaQrAssetId`.
- `LineItem`: `code`, `description`, `detail`, `unit`, `quantity`, `unitPrice`.
- `SellerProfile`: name, address, NIT, commercial registry, bank account, bank branch, and the three asset ids. Stored once, copied into each new invoice.
- `Preferences`: `density` (`compact` | `spacious`), `showCarrier`, `showSignatures`, `showPaymentQr`.
- Images are never embedded in an invoice record; only asset ids are. Base64 appears only inside export files.
- Numeric input fields hold the user's raw text. The domain parses on demand, accepting comma or point as decimal separator, treating empty or invalid input as zero.
- Money math is done in integer cents. Line amount rounds once; subtotal is the sum of rounded line amounts; taxable base is `max(subtotal − discount, 0)`; tax is `base × percent / 100` rounded once; total is `base + tax + shipping`; CUP equivalent is `total × exchangeRate` rounded once.
- Next number is `max(number within same series) + 1`, zero-padded to 4 digits, computed from the history. Saving with an existing series+number replaces that record.
- Res. 55 rules produce a list of 13 entries, each with a stable id, Spanish label, fulfilled flag, and the id of the field to focus. Entries for carrier and signatures are reported as not applicable when the corresponding section is hidden by preferences.
- Every persisted record and every export file carries `schemaVersion`. A migration function upgrades any older version to current on read. v1 is version 1; the prototype's `facturath.v2` localStorage key is not migrated because it never reached production.

### Storage

- Two ports in `core`: `InvoiceRepository` (list summaries, get, save, delete, get draft, save draft) and `AssetStore` (put Blob, get Blob, delete). A third small port, `PreferencesStore`, covers seller profile and preferences.
- Adapters: IndexedDB for invoices, draft, and assets (one database, object stores `invoices` and `assets`, index on series+number), using a minimal promise wrapper written in-project rather than a library. localStorage for profile and preferences as two JSON keys.
- When IndexedDB is unavailable, an in-memory adapter is used for the session and the user sees a single persistent notice that saving is disabled. Quota errors surface as a toast.
- Nothing is sent over the network. The ports exist to allow a future BALANC sync adapter.

### State

- `InvoiceStore` holds the open invoice as a signal and exposes computed signals for line amounts, totals, CUP equivalent, compliance state, pending count, and header reference. Mutations only through its methods: set field, update line, add line, remove line, new invoice, load, replace from import. Totals are computed by calling domain functions inside `computed()`, so every keystroke reflects instantly in amounts and totals.
- `SettingsStore` holds seller profile and preferences and persists on change through an effect.
- `SavedInvoicesStore` holds the history summaries and delegates persistence to `InvoiceRepository`.
- Draft autosave: the open invoice is written to the draft slot 500 ms after the last change. On startup the draft is restored if present; otherwise a new invoice is created from the profile and next number.
- Inline fields bind directly to the store with value and input bindings. Signal Forms are not used: the document is a free editing surface with no submit step and validation is handled by the domain.

### Export and import

- Single-invoice export: JSON with `schemaVersion`, the invoice, and referenced images inlined as base64 data URLs. File name `factura-<series>-<number>.json`.
- Backup export: same format with all invoices, the profile, preferences, and all assets.
- Import single: validates, migrates, stores inlined images as Blobs, replaces the open invoice.
- Import backup: validates, migrates, merges into history (same series+number replaces), restores profile only if the current profile is empty, imports assets.
- Invalid files produce a toast explaining the file is not a FACTURATH export.

### Printing

- `window.print()` with a print stylesheet: page margins 10 mm, app chrome and empty upload placeholders hidden, document borders and shadows removed, images with exact color adjustment.
- The compliance count and any pending state never block printing.

### PWA

- Angular service worker with the app shell prefetched and assets lazy. No data groups because there is no API.
- Update notifier shows a toast with a reload action; the app never reloads on its own.
- Manifest with ATHENDAT isotype icons at 192 and 512 px including maskable variants, standalone display, brand indigo theme color, `start_url` `/`.

### Deployment

- Cloudflare Workers static assets: a `wrangler` config declaring only the assets directory with single-page-application routing, no Worker script.
- A headers file sets long immutable cache for hashed files and `no-cache` for `index.html` and the service-worker manifest.
- GitHub Actions: on pull requests, install, test, build. On push to `main`, additionally deploy with wrangler using an API token and account id stored as repository secrets.
- Domain to be confirmed by ATHENDAT; all paths are root-relative so it does not affect the build.

### Accessibility

- Every inline field has an `aria-label` matching its placeholder meaning.
- Drawers and dialogs trap focus, restore focus on close, and close with Escape.
- Colors are taken from the design-system tokens and checked for WCAG AA contrast.
- Icon-only buttons carry `aria-label`.

## Testing Decisions

A good test drives the system through a public boundary the way a real user or caller would, and asserts only on observable outcomes. It does not reach into private state, does not assert on call counts of internals, and does not snapshot markup.

Two seams, agreed with the product owner:

1. **Stores with in-memory repositories.** The primary seam. Tests instantiate `InvoiceStore`, `SettingsStore`, and `SavedInvoicesStore` through Angular's `TestBed` with in-memory fakes bound to the storage ports. They act as the UI would (set a field, update a line, save, load, import) and assert on the computed signals the UI reads (line amounts, totals, CUP equivalent, compliance entries, pending count, header reference, history summaries). All domain logic is exercised through this seam: cents rounding, discount capping at zero base, tax on base not on shipping, comma and point parsing, per-series numbering with 4-digit padding, replace-on-same-reference, compliance transitions for each of the 13 entries, hidden sections reported as not applicable, migration of each prior schema version, draft autosave and restore, new invoice keeping profile and advancing number.

2. **Storage adapters against `fake-indexeddb`.** A small separate seam for behavior invisible from the store: save and list, replace by series+number, delete, index queries, Blob round-trip, draft slot. `fake-indexeddb` is the only test dependency added.

Direct tests of a pure domain function are allowed only as an exception, when a rounding or migration case is awkward to express through the store.

Three behavior tests on components: the line-items table adds and removes rows, the compliance panel focuses the target field on click, the saved-invoices drawer opens and deletes an entry. No visual or snapshot tests.

Runner is Vitest through the Angular CLI test builder, which the scaffold already configures. There is no prior art in this repository; the scaffold's single default spec is the only existing test and will be replaced.

Manual checks before release: print output in Chrome, Firefox, and iOS Safari; install prompt on Android Chrome and desktop Chrome; offline reload. These are listed as a checklist in the README.

CI gates: tests green, build within size budget, build with no warnings.

## Out of Scope

- Share-by-link (URL-encoded read-only view) and email sending. The data model keeps image references separate so a link without images can be added later.
- Multiple taxes per invoice, per-line discounts, multiple seller profiles, per-line currency.
- Any server, account, sync, or cloud backup. BALANC sync is a future adapter, not part of v1.
- Analytics of any kind.
- Languages other than Spanish.
- End-to-end browser tests. Deferred to a later iteration.
- Migration of data stored by the Claude Design prototype.
- A native PDF generator. The browser print dialog is the PDF path.
- GitHub Pages deployment.

## Further Notes

- The compliance list content (the 13 data points and where each is captured) is taken verbatim from the design and Res. 55/2021 and should be kept as Spanish strings owned by the domain layer so the label and the rule live together.
- The Claude Design prototype exposed four design-time props (density and three section toggles). They become user preferences in the settings panel with the same defaults: spacious, and all three sections shown.
- The design's second file `FACTURATH v1.dc.html` is an older iteration and is not a source for this spec.
- The ATHENDAT design system README defines voice: tú, sentence case, short sentences, no exclamation marks, no emoji in product UI. Toasts and empty states follow it.
