import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the app's own CSS back at test time, so the accessibility suite can assert
 * contrast against what the stylesheets actually paint rather than a hand-kept list.
 * Test-only: it uses `node:fs` and never ships (`src/**​/testing/**` is excluded from
 * the app tsconfig).
 */

/** One colour-bearing declaration, located well enough to name it in a failure. */
export interface ColorDeclaration {
  /** Path of the stylesheet or component, relative to the project root. */
  readonly source: string;
  /** The single selector this declaration applies to (a group is split into one each). */
  readonly selector: string;
  readonly property: string;
  readonly value: string;
}

/** Properties that put colour on the screen. */
const COLOR_PROPERTIES = new Set([
  'color',
  'background',
  'background-color',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-color',
  'outline',
  'outline-color',
  'box-shadow',
  'accent-color',
]);

/** Values that paint nothing, so they carry no contrast. */
const PAINTS_NOTHING = /^(0|none|transparent|inherit|initial|unset|currentcolor)$/i;

const REFERENCES_COLOR = /var\(--|#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

/** Removes `@media print` blocks: ink on paper is not the screen UI WCAG 1.4.3/1.4.11 govern. */
function stripPrintRules(css: string): string {
  let result = '';
  let index = 0;
  for (;;) {
    const start = css.indexOf('@media print', index);
    if (start === -1) {
      return result + css.slice(index);
    }
    result += css.slice(index, start);
    const open = css.indexOf('{', start);
    if (open === -1) {
      return result;
    }
    let depth = 1;
    let cursor = open + 1;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === '{') depth++;
      else if (css[cursor] === '}') depth--;
      cursor++;
    }
    index = cursor;
  }
}

/**
 * Every colour-bearing declaration in `css`. Blocks are matched innermost-first, so a
 * rule nested in an at-rule keeps its own selector.
 */
export function parseColorDeclarations(css: string, source: string): ColorDeclaration[] {
  const cleaned = stripPrintRules(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations: ColorDeclaration[] = [];

  for (const block of cleaned.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = block[1]
      .split(',')
      .map((selector) => selector.trim().replace(/\s+/g, ' '))
      .filter((selector) => selector !== '' && !selector.startsWith('@'));

    for (const rule of block[2].split(';')) {
      const separator = rule.indexOf(':');
      if (separator === -1) {
        continue;
      }
      const property = rule.slice(0, separator).trim().toLowerCase();
      const value = rule
        .slice(separator + 1)
        .trim()
        .replace(/\s+/g, ' ');
      if (!COLOR_PROPERTIES.has(property) || PAINTS_NOTHING.test(value)) {
        continue;
      }
      if (!REFERENCES_COLOR.test(value)) {
        continue;
      }
      for (const selector of selectors) {
        declarations.push({ source, selector, property, value });
      }
    }
  }

  return declarations;
}

/** The CSS inside a component's `styles:` template literal, or '' when it has none. */
function componentStyles(typescript: string): string {
  const marker = /styles:\s*`/.exec(typescript);
  if (!marker) {
    return '';
  }
  const start = marker.index + marker[0].length;
  const end = typescript.indexOf('`', start);
  return end === -1 ? '' : typescript.slice(start, end);
}

function stylesheetFiles(): string[] {
  const found: string[] = ['src/styles.css'];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(directory, entry.name).split('\\').join('/');
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith('.css')) {
        found.push(path);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        found.push(path);
      }
    }
  };
  walk('src/app');
  return found;
}

/**
 * Every colour-bearing declaration the app paints: `src/styles.css`, every `.css` under
 * `src/app`, and every component `styles:` block. `src/styles/tokens.css` is not included
 * because it only defines tokens; the spec reads its values separately.
 */
export function appColorDeclarations(): ColorDeclaration[] {
  return stylesheetFiles().flatMap((path) => {
    const text = readFileSync(path, 'utf8');
    const css = path.endsWith('.css') ? text : componentStyles(text);
    return css === '' ? [] : parseColorDeclarations(css, path);
  });
}
