import { readFileSync } from 'node:fs';
import { composite, contrastRatio, parseColor } from './core/testing/contrast';
import { appColorDeclarations, type ColorDeclaration } from './core/testing/stylesheets';

/**
 * WCAG AA contrast over the real ATHENDAT tokens (#15).
 *
 * Nothing here is a snapshot. The token values are read from `src/styles/tokens.css`
 * and the declarations are scanned out of the app's own stylesheets, both at test time;
 * the table below says, for each declaration the app paints, what it is painted on.
 * A declaration the table does not mention fails `covers every colour the app paints`,
 * so a new component with a new colour pair cannot pass silently.
 */

/** 1.4.3 normal text. */
const AA_TEXT = 4.5;
/** 1.4.3 large text (>= 24px, or >= 18.66px bold) and 1.4.11 non-text contrast. */
const AA_LARGE_OR_NON_TEXT = 3;

const TOKENS_FILE = 'src/styles/tokens.css';

function readTokens(): Map<string, string> {
  const css = readFileSync(TOKENS_FILE, 'utf8');
  const declared = new Map<string, string>();
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    declared.set(match[1], match[2].trim());
  }

  const resolve = (value: string, depth = 0): string => {
    if (depth > 10) {
      throw new Error(`Token reference cycle in: ${value}`);
    }
    return value
      .replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
        const target = declared.get(name);
        if (target === undefined) {
          throw new Error(`Unknown token: ${name}`);
        }
        return resolve(target, depth + 1);
      })
      .trim();
  };

  return new Map([...declared].map(([name, value]) => [name, resolve(value)]));
}

const tokens = readTokens();

/** Resolves any `var(--x)` in `value` down to literal colours. */
function resolveValue(value: string): string {
  return value
    .replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      const resolved = tokens.get(name);
      if (resolved === undefined) {
        throw new Error(`${TOKENS_FILE} does not define ${name}`);
      }
      return resolved;
    })
    .trim();
}

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;

/**
 * The colour a declaration actually paints. Shorthands carry other parts
 * (`1px solid #6B7280`, `0 0 0 2px #3A0CA3`), so this takes the colour out of them.
 */
function paintedColor(value: string): string {
  const literals = resolveValue(value).match(COLOR_LITERAL);
  if (!literals || literals.length === 0) {
    throw new Error(`No colour in: ${value}`);
  }
  return literals[literals.length - 1];
}

/**
 * Flattens a backdrop stack, written topmost layer first, into one opaque colour.
 * The bottom layer must be opaque, which is what the page always ends in.
 */
function flatten(stack: readonly string[]): string {
  // A layer is either a token name (`--bg-0`) or a literal (`rgba(255, 255, 255, 0.94)`).
  const layers = stack.map((layer) =>
    parseColor(layer.startsWith('--') ? resolveValue(`var(${layer})`) : resolveValue(layer)),
  );
  let painted = layers[layers.length - 1];
  if (painted.a !== 1) {
    throw new Error(`The bottom of a backdrop stack must be opaque: ${stack.join(' over ')}`);
  }
  for (let index = layers.length - 2; index >= 0; index--) {
    painted = composite(layers[index], painted);
  }
  return `rgb(${painted.r}, ${painted.g}, ${painted.b})`;
}

/** What a declaration has to satisfy. A backdrop stack is written topmost layer first. */
type Requirement =
  /** Text: 4.5:1 against every backdrop it can sit on. */
  | { kind: 'text'; on: readonly (readonly string[])[] }
  /** An icon glyph, a control boundary or a focus indicator: 3:1 (WCAG 1.4.11). */
  | { kind: 'nonText'; on: readonly (readonly string[])[] }
  /** A background: it is itself a backdrop, and the pairs that sit on it assert it. */
  | { kind: 'surface' }
  /** Carries no information: a separator, a rule, a drop shadow, a frame around content. */
  | { kind: 'decorative'; why: string };

/** Backdrop stacks, named once so the table reads as the layout does. */
/** The page behind the document. */
const PAGE = [['--gray-100']] as const;
/** The white document sheet, and the drawer panels, which are also white. */
const SHEET = [['--bg-0']] as const;
/** The sticky translucent header, which floats over both the page and the sheet. */
const HEADER = [
  ['rgba(255, 255, 255, 0.94)', '--gray-100'],
  ['rgba(255, 255, 255, 0.94)', '--bg-0'],
] as const;
/** An inline field: white at rest and on focus, tinted while the pointer is over it. */
const FIELD = [['--bg-0'], ['--gray-100']] as const;

const text = (on: readonly (readonly string[])[]): Requirement => ({ kind: 'text', on });
const nonText = (on: readonly (readonly string[])[]): Requirement => ({ kind: 'nonText', on });
const surface: Requirement = { kind: 'surface' };
const decorative = (why: string): Requirement => ({ kind: 'decorative', why });

const SEPARATOR = decorative('a hairline between blocks, carrying no information');
const FRAME = decorative('frames content rather than identifying a control');

/**
 * Every colour-bearing declaration in the app, keyed `source|selector|property`.
 * Adding a colour to a component without adding it here fails the coverage test.
 */
const PAINTED: Record<string, Requirement> = {
  // --- src/styles.css: the page itself and its links.
  'src/styles.css|body|background': surface,
  'src/styles.css|body|color': text(PAGE),
  'src/styles.css|a|color': text(PAGE),
  'src/styles.css|a:hover|color': text(PAGE),
  'src/styles.css|.eyebrow|color': text(SHEET),

  // --- src/app/app.css: the sticky header, its buttons and the footer line.
  'src/app/app.css|.app-top|background': surface,
  'src/app/app.css|.app-top|border-bottom': SEPARATOR,
  'src/app/app.css|.primary|background': surface,
  'src/app/app.css|.primary|color': text([['--bg-brand']]),
  'src/app/app.css|.primary:hover|background': surface,
  'src/app/app.css|.secondary|border': nonText(HEADER),
  'src/app/app.css|.secondary|background': surface,
  'src/app/app.css|.secondary|color': text(SHEET),
  'src/app/app.css|.secondary:hover|background': surface,
  'src/app/app.css|.primary:focus-visible|outline': nonText(HEADER),
  'src/app/app.css|.secondary:focus-visible|outline': nonText(HEADER),
  'src/app/app.css|.divider|background': SEPARATOR,
  'src/app/app.css|.icon-button|color': nonText([...HEADER, ['--gem-50']]),
  'src/app/app.css|.icon-button:hover|background': surface,
  'src/app/app.css|.icon-button:focus-visible|outline': nonText(HEADER),
  'src/app/app.css|.badge|background': surface,
  'src/app/app.css|.badge|color': text([['--warning-bg']]),
  'src/app/app.css|.wordmark|color': text(HEADER),
  'src/app/app.css|.reference|border-left': SEPARATOR,
  'src/app/app.css|.reference|color': text(HEADER),
  'src/app/app.css|.app-footer|color': text(PAGE),

  // --- file panel (inside a white drawer).
  'src/app/features/import-export/file-panel.ts|.group + .group|border-top': SEPARATOR,
  'src/app/features/import-export/file-panel.ts|.button|border': nonText(SHEET),
  'src/app/features/import-export/file-panel.ts|.button|background': surface,
  'src/app/features/import-export/file-panel.ts|.button|color': text(SHEET),
  'src/app/features/import-export/file-panel.ts|.button:hover|background': surface,
  'src/app/features/import-export/file-panel.ts|.button:focus-visible|outline': nonText(SHEET),
  'src/app/features/import-export/file-panel.ts|.hint|color': text(SHEET),
  'src/app/features/import-export/file-panel.ts|.label|color': text(SHEET),
  'src/app/features/import-export/file-panel.ts|.file:focus-visible|outline': nonText(SHEET),

  // --- compliance panel.
  'src/app/features/invoice-editor/compliance-panel.ts|.intro|color': text(SHEET),
  'src/app/features/invoice-editor/compliance-panel.ts|.item|border-top': SEPARATOR,
  'src/app/features/invoice-editor/compliance-panel.ts|.number|color': text(SHEET),
  'src/app/features/invoice-editor/compliance-panel.ts|.where|color': text(SHEET),
  'src/app/features/invoice-editor/compliance-panel.ts|.fulfilled .state|background': surface,
  'src/app/features/invoice-editor/compliance-panel.ts|.fulfilled .state|color': text([
    ['--success-bg'],
  ]),
  'src/app/features/invoice-editor/compliance-panel.ts|.pending .state|background': surface,
  'src/app/features/invoice-editor/compliance-panel.ts|.pending .state|color': text([
    ['--warning-bg'],
  ]),
  'src/app/features/invoice-editor/compliance-panel.ts|.not-applicable .state|background': surface,
  'src/app/features/invoice-editor/compliance-panel.ts|.not-applicable .state|color': text([
    ['--bg-2'],
  ]),
  'src/app/features/invoice-editor/compliance-panel.ts|.go|border': nonText(SHEET),
  'src/app/features/invoice-editor/compliance-panel.ts|.go|background': surface,
  'src/app/features/invoice-editor/compliance-panel.ts|.go|color': text(SHEET),
  'src/app/features/invoice-editor/compliance-panel.ts|.go:hover|background': surface,
  'src/app/features/invoice-editor/compliance-panel.ts|.go:focus-visible|outline': nonText(SHEET),

  // --- document meta, inside the sheet.
  'src/app/features/invoice-editor/document-meta.ts|.label|color': text(SHEET),
  'src/app/features/invoice-editor/document-meta.ts|.separator|color': text(SHEET),
  'src/app/features/invoice-editor/document-meta.ts|.currency:hover|background': surface,
  'src/app/features/invoice-editor/document-meta.ts|.currency:focus|background': surface,
  'src/app/features/invoice-editor/document-meta.ts|.currency:focus|box-shadow': nonText(FIELD),

  // --- the sheet itself.
  'src/app/features/invoice-editor/invoice-editor.ts|.sheet|border': FRAME,
  'src/app/features/invoice-editor/invoice-editor.ts|.sheet|background': surface,
  'src/app/features/invoice-editor/invoice-editor.ts|.sheet|box-shadow': decorative(
    'a drop shadow lifting the sheet off the page',
  ),
  'src/app/features/invoice-editor/invoice-editor.ts|.head|border-bottom': SEPARATOR,
  'src/app/features/invoice-editor/invoice-editor.ts|.band|border-top': SEPARATOR,

  // --- legal footer.
  'src/app/features/invoice-editor/legal-footer.ts|:host|border-top': SEPARATOR,
  'src/app/features/invoice-editor/legal-footer.ts|p|color': text(SHEET),

  // --- line items table.
  'src/app/features/invoice-editor/line-items-table.css|:host|border': FRAME,
  'src/app/features/invoice-editor/line-items-table.css|th|background': surface,
  'src/app/features/invoice-editor/line-items-table.css|th|color': text([['--gray-100']]),
  'src/app/features/invoice-editor/line-items-table.css|td|border-top': SEPARATOR,
  'src/app/features/invoice-editor/line-items-table.css|.muted|color': text(SHEET),
  'src/app/features/invoice-editor/line-items-table.css|.times|color': text(SHEET),
  'src/app/features/invoice-editor/line-items-table.css|.delete|color': nonText(SHEET),
  'src/app/features/invoice-editor/line-items-table.css|.delete:hover|background': surface,
  'src/app/features/invoice-editor/line-items-table.css|.delete:hover|color': nonText([
    ['--danger-bg'],
  ]),
  'src/app/features/invoice-editor/line-items-table.css|.add|border-top': SEPARATOR,
  'src/app/features/invoice-editor/line-items-table.css|.add|background': surface,
  'src/app/features/invoice-editor/line-items-table.css|.add|color': text([
    ['--gray-50'],
    ['--gem-50'],
  ]),
  'src/app/features/invoice-editor/line-items-table.css|.add:hover|background': surface,
  'src/app/features/invoice-editor/line-items-table.css|.delete:focus-visible|box-shadow':
    nonText(SHEET),
  'src/app/features/invoice-editor/line-items-table.css|.add:focus-visible|box-shadow': nonText([
    ['--gray-50'],
    ['--gem-50'],
  ]),

  // --- the remaining blocks inside the sheet.
  'src/app/features/invoice-editor/party-block.ts|.address|color': text(SHEET),
  'src/app/features/invoice-editor/signatures-block.ts|.line|border-bottom': nonText(SHEET),
  'src/app/features/invoice-editor/signatures-block.ts|.caption|color': text(SHEET),
  'src/app/features/invoice-editor/text-block.ts|.text|color': text(SHEET),
  'src/app/features/invoice-editor/totals-panel.ts|.percent|color': text(SHEET),
  'src/app/features/invoice-editor/totals-panel.ts|.total|border-top': SEPARATOR,
  'src/app/features/invoice-editor/totals-panel.ts|.equivalent|color': text(SHEET),

  // --- saved invoices drawer.
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.empty|color': text(SHEET),
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.row|border-bottom': SEPARATOR,
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.reference|color': text(SHEET),
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.buyer|color': text(SHEET),
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.meta|color': text(SHEET),
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.action|border': nonText(SHEET),
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.action|background': surface,
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.action:hover|background': surface,
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.action:focus-visible|outline':
    nonText(SHEET),
  'src/app/features/saved-invoices/saved-invoices-drawer.ts|.danger|color': text(SHEET),

  // --- settings panel.
  'src/app/features/settings/settings-panel.ts|.group + .group|border-top': SEPARATOR,
  'src/app/features/settings/settings-panel.ts|.label|color': text(SHEET),
  'src/app/features/settings/settings-panel.ts|.input|border': nonText(SHEET),
  'src/app/features/settings/settings-panel.ts|.input|background': surface,
  'src/app/features/settings/settings-panel.ts|.input:focus|border-color': nonText(SHEET),
  'src/app/features/settings/settings-panel.ts|.input:focus|box-shadow': nonText(SHEET),
  'src/app/features/settings/settings-panel.ts|.legend|color': text(SHEET),
  'src/app/features/settings/settings-panel.ts|.choice input|accent-color': nonText(SHEET),
  'src/app/features/settings/settings-panel.ts|.choice input:focus-visible|outline': nonText(SHEET),

  // --- the Res. 55 seal, in the header and as the first row of the white phone menu (#61).
  // Its dashed stamp line and the ring are currentColor, so the text rows cover them.
  'src/app/shared/ui/compliance-seal.ts|.seal|background': surface,
  'src/app/shared/ui/compliance-seal.ts|.seal|color': text([['--warning-bg']]),
  'src/app/shared/ui/compliance-seal.ts|.seal.complete|background': surface,
  'src/app/shared/ui/compliance-seal.ts|.seal.complete|color': text([['--success-bg']]),
  'src/app/shared/ui/compliance-seal.ts|.seal:focus-visible|outline': nonText([
    ...HEADER,
    ...SHEET,
  ]),

  // --- the "Más" menu button in the header and its white menu, a lazy chunk (#61). An item is white at
  // rest and --gem-50 under the pointer or focus.
  'src/app/shared/ui/menu-button.ts|.trigger|border': nonText(HEADER),
  'src/app/shared/ui/menu-button.ts|.trigger|background': surface,
  'src/app/shared/ui/menu-button.ts|.trigger|color': text([['--bg-0'], ['--bg-2']]),
  'src/app/shared/ui/menu-button.ts|.trigger:hover|background': surface,
  'src/app/shared/ui/menu-button.ts|.trigger:focus-visible|outline': nonText(HEADER),
  'src/app/shared/ui/menu-list.ts|.menu|border': FRAME,
  'src/app/shared/ui/menu-list.ts|.menu|background': surface,
  'src/app/shared/ui/menu-list.ts|.menu|box-shadow': decorative(
    'a drop shadow lifting the menu off the page',
  ),
  'src/app/shared/ui/menu-list.ts|.separator|background': SEPARATOR,
  'src/app/shared/ui/menu-list.ts|.item|background': surface,
  'src/app/shared/ui/menu-list.ts|.item|color': text([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-list.ts|.item app-icon|color': nonText([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-list.ts|.item:hover|background': surface,
  'src/app/shared/ui/menu-list.ts|.item:focus|background': surface,
  'src/app/shared/ui/menu-list.ts|.item:focus-visible|outline': nonText([['--gem-50']]),
  'src/app/shared/ui/menu-list.ts|.detail|color': text([['--bg-0'], ['--gem-50']]),

  // --- the phone menu drawer (#61): white, with --gem-50 under the pointer.
  'src/app/shared/ui/menu-drawer.ts|.dhead|border-bottom': SEPARATOR,
  'src/app/shared/ui/menu-drawer.ts|.wordmark|color': text(SHEET),
  'src/app/shared/ui/menu-drawer.ts|.ref|color': text(SHEET),
  'src/app/shared/ui/menu-drawer.ts|.close|background': surface,
  'src/app/shared/ui/menu-drawer.ts|.close|color': nonText([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-drawer.ts|.close:hover|background': surface,
  'src/app/shared/ui/menu-drawer.ts|.glabel|color': text(SHEET),
  'src/app/shared/ui/menu-drawer.ts|.ditem|background': surface,
  'src/app/shared/ui/menu-drawer.ts|.ditem|color': text([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-drawer.ts|.ditem app-icon|color': nonText([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-drawer.ts|.ditem:hover|background': surface,
  'src/app/shared/ui/menu-drawer.ts|.close:focus-visible|outline': nonText([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-drawer.ts|.ditem:focus-visible|outline': nonText([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-drawer.ts|.n|color': text([['--bg-0'], ['--gem-50']]),
  'src/app/shared/ui/menu-drawer.ts|.dfoot|border-top': SEPARATOR,
  'src/app/shared/ui/menu-drawer.ts|.dfoot|color': text(SHEET),

  // --- the drawer shell every panel sits in.
  'src/app/shared/ui/drawer.ts|.backdrop|background': surface,
  'src/app/shared/ui/drawer.ts|.panel|background': surface,
  'src/app/shared/ui/drawer.ts|.panel|box-shadow': decorative(
    'a drop shadow separating the panel from the page',
  ),
  'src/app/shared/ui/drawer.ts|.panel-header|border-bottom': SEPARATOR,
  'src/app/shared/ui/drawer.ts|.close|border': nonText(SHEET),
  'src/app/shared/ui/drawer.ts|.close|background': surface,
  'src/app/shared/ui/drawer.ts|.close:hover|background': surface,
  'src/app/shared/ui/drawer.ts|.close:focus-visible|outline': nonText(SHEET),

  // --- image control: the upload box is identified by its dashed boundary alone.
  'src/app/shared/ui/image-control.ts|.pick:focus-within|box-shadow': nonText(SHEET),
  'src/app/shared/ui/image-control.ts|.image|border': FRAME,
  'src/app/shared/ui/image-control.ts|.placeholder|border': nonText(FIELD),
  'src/app/shared/ui/image-control.ts|.placeholder|color': text(FIELD),
  'src/app/shared/ui/image-control.ts|.pick:hover .placeholder|background': surface,
  'src/app/shared/ui/image-control.ts|.remove|border': FRAME,
  'src/app/shared/ui/image-control.ts|.remove|background': surface,
  'src/app/shared/ui/image-control.ts|.remove|color': nonText(SHEET),
  'src/app/shared/ui/image-control.ts|.remove:hover|background': surface,
  'src/app/shared/ui/image-control.ts|.remove:hover|color': nonText([['--danger-bg']]),
  'src/app/shared/ui/image-control.ts|.remove:focus-visible|box-shadow': nonText(SHEET),
  'src/app/shared/ui/image-control.ts|.caption|color': text(SHEET),

  // --- inline fields.
  'src/app/shared/ui/inline-input.ts|input::placeholder|color': text(FIELD),
  'src/app/shared/ui/inline-input.ts|input:hover|background': surface,
  'src/app/shared/ui/inline-input.ts|input:focus|background': surface,
  'src/app/shared/ui/inline-input.ts|input:focus|box-shadow': nonText(FIELD),
  'src/app/shared/ui/inline-textarea.ts|textarea::placeholder|color': text(FIELD),
  'src/app/shared/ui/inline-textarea.ts|textarea:hover|background': surface,
  'src/app/shared/ui/inline-textarea.ts|textarea:focus|background': surface,
  'src/app/shared/ui/inline-textarea.ts|textarea:focus|box-shadow': nonText(FIELD),

  // --- toast.
  'src/app/shared/ui/toast-host.ts|.toast|background': surface,
  'src/app/shared/ui/toast-host.ts|.toast|color': text([['--gem-100']]),
  'src/app/shared/ui/toast-host.ts|button:hover|background': surface,
  'src/app/shared/ui/toast-host.ts|button:focus-visible|outline': nonText([
    ['--gem-100'],
    ['--gem-200'],
  ]),
};

const key = (declaration: ColorDeclaration): string =>
  `${declaration.source}|${declaration.selector}|${declaration.property}`;

const declarations = appColorDeclarations();

describe('the contrast table', () => {
  it('covers every colour the app paints', () => {
    const uncovered = declarations
      .filter((declaration) => PAINTED[key(declaration)] === undefined)
      .map((declaration) => `${key(declaration)} -> ${declaration.value}`);

    expect(uncovered).toEqual([]);
  });

  it('has no row for a colour the app no longer paints', () => {
    const painted = new Set(declarations.map(key));
    expect(Object.keys(PAINTED).filter((row) => !painted.has(row))).toEqual([]);
  });

  it('scans the whole app, not a stray file', () => {
    // Guards against a silent pass if the scan ever stops finding stylesheets.
    expect(declarations.length).toBeGreaterThan(100);
    expect(new Set(declarations.map((declaration) => declaration.source)).size).toBeGreaterThan(15);
  });
});

describe('contrast of every colour the app paints (WCAG 1.4.3 and 1.4.11 AA)', () => {
  for (const declaration of declarations) {
    const requirement = PAINTED[key(declaration)];
    if (requirement === undefined || requirement.kind === 'surface') {
      continue;
    }
    if (requirement.kind === 'decorative') {
      continue;
    }

    const minimum = requirement.kind === 'text' ? AA_TEXT : AA_LARGE_OR_NON_TEXT;
    for (const stack of requirement.on) {
      it(`${key(declaration)} on ${stack.join(' over ')} reaches ${minimum}:1`, () => {
        const ratio = contrastRatio(paintedColor(declaration.value), flatten(stack));
        expect(ratio).toBeGreaterThanOrEqual(minimum);
      });
    }
  }
});

describe('token usage', () => {
  it('never paints text with --fg-4, which is 2.5:1 on white', () => {
    const offenders = declarations
      .filter(
        (declaration) => declaration.property === 'color' && declaration.value.includes('--fg-4'),
      )
      .map(key);
    expect(offenders).toEqual([]);
  });

  it('never bounds a control with --border-2, which is 1.5:1 on white', () => {
    const offenders = declarations
      .filter(
        (declaration) =>
          /^(border|outline)/.test(declaration.property) &&
          declaration.value.includes('--border-2'),
      )
      .map(key);
    expect(offenders).toEqual([]);
  });
});
