# Application layers

The app source is split into four layers. Dependencies point inward only:
`features` and `shared/ui` may use `core` and `domain`; `core` may use
`domain`; `domain` uses nothing.

## `domain/`

Pure TypeScript. No Angular imports, no browser APIs, no I/O. Holds the
invoice model and its rules: money parsing and rounding, totals, per-series
numbering, required-field rules (Res. 55/2021), `Intl` formatting with
`es-CU`, schema versioning and migrations. Everything here is a plain
function or type and is testable without `TestBed`.

## `core/`

Cross-cutting infrastructure: storage ports (interfaces) and their adapters,
injection tokens, and app-wide services (toast, service-worker update
notifier). Stores that must be shared between features live here. `core`
knows about `domain` but never about a specific feature.

## `features/`

One folder per feature (`invoice-editor`, `saved-invoices`, `settings`,
`compliance`, `import-export`). Each feature owns its signal store and its
components. Features never import another feature's internals; they share
state only through stores in `core` or through `domain` types.

## `shared/ui/`

Tiny presentational components with no business logic: inline input,
drawer, dialog, toast host, icon buttons. They receive data through
`input()` and report through `output()`; they do not inject stores.
