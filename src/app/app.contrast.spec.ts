import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio } from './domain/contrast';

/**
 * WCAG AA contrast over the real ATHENDAT tokens (#15). The token values are read
 * from `src/styles/tokens.css` at test time, so changing a token changes this test.
 * The pairs below mirror the stylesheets: each one names the file it comes from.
 */

/** 1.4.3 normal text. */
const AA_TEXT = 4.5;
/** 1.4.3 large text (>= 24px, or >= 18.66px bold) and 1.4.11 non-text contrast. */
const AA_LARGE_OR_NON_TEXT = 3;

const SOURCE = 'src/styles/tokens.css';

function readTokens(): Map<string, string> {
  const css = readFileSync(SOURCE, 'utf8');
  const declared = new Map<string, string>();
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    declared.set(match[1], match[2].trim());
  }

  // `var(--a)` may point at another token; resolve until only literals are left.
  const resolve = (value: string, depth = 0): string => {
    if (depth > 10) {
      throw new Error(`Token reference cycle in: ${value}`);
    }
    const expanded = value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      const target = declared.get(name);
      if (target === undefined) {
        throw new Error(`Unknown token: ${name}`);
      }
      return resolve(target, depth + 1);
    });
    return expanded.trim();
  };

  return new Map([...declared].map(([name, value]) => [name, resolve(value)]));
}

const tokens = readTokens();

function token(name: string): string {
  const value = tokens.get(name);
  if (value === undefined) {
    throw new Error(`${SOURCE} does not define ${name}`);
  }
  return value;
}

function ratio(foreground: string, background: string): number {
  return contrastRatio(token(foreground), token(background));
}

/** Every stylesheet in the app, so a usage guard can look at all of them at once. */
function stylesheets(): { path: string; css: string }[] {
  const found: { path: string; css: string }[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (/\.(css|ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
        found.push({ path, css: readFileSync(path, 'utf8') });
      }
    }
  };
  walk('src');
  return found;
}

describe('text contrast (WCAG 1.4.3 AA)', () => {
  const pairs: [name: string, foreground: string, background: string][] = [
    // styles.css: body copy and the .eyebrow section titles on the sheet and on the page.
    ['body text on the page', '--fg-1', '--gray-100'],
    ['body text on the sheet', '--fg-1', '--bg-0'],
    ['eyebrow titles on the sheet', '--fg-3', '--bg-0'],
    // app.css: header wordmark, reference, secondary and primary buttons, footer.
    ['wordmark on the header', '--gem-900', '--bg-0'],
    ['header reference on the header', '--fg-3', '--bg-0'],
    ['secondary button label', '--gem-900', '--bg-0'],
    ['secondary button label on hover', '--gem-900', '--bg-2'],
    ['primary button label', '--fg-on-brand', '--bg-brand'],
    ['primary button label on hover', '--fg-on-brand', '--gem-800'],
    ['app footer text', '--fg-2', '--gray-100'],
    ['app footer link', '--fg-link', '--gray-100'],
    ['app footer link on hover', '--fg-link-hover', '--gray-100'],
    // line-items-table.css: column headers, muted detail, the x separator and the add row.
    ['line table column headers', '--fg-2', '--gray-100'],
    ['line table muted detail', '--fg-3', '--bg-0'],
    ['line table quantity separator', '--fg-3', '--bg-0'],
    ['line table delete button', '--fg-3', '--bg-0'],
    ['line table delete button on hover', '--danger-fg', '--danger-bg'],
    ['line table add row', '--gem-900', '--gray-50'],
    ['line table add row on hover', '--gem-900', '--gem-50'],
    // legal-footer.ts, signatures-block.ts, totals-panel.ts, document-meta.ts, party-block.ts.
    ['legal footer notice', '--fg-3', '--bg-0'],
    ['signature captions', '--fg-3', '--bg-0'],
    ['totals labels', '--fg-3', '--bg-0'],
    ['document meta labels', '--fg-3', '--bg-0'],
    ['party block labels', '--fg-2', '--bg-0'],
    // inline-input.ts / inline-textarea.ts / image-control.ts: placeholder text is text.
    ['field placeholder', '--fg-placeholder', '--bg-0'],
    ['field placeholder on hover', '--fg-placeholder', '--gray-100'],
    ['image upload box text', '--fg-placeholder', '--bg-0'],
    ['image upload box text on hover', '--fg-placeholder', '--gray-100'],
    ['image caption', '--fg-2', '--bg-0'],
    ['image remove button', '--fg-3', '--bg-0'],
    ['image remove button on hover', '--danger-fg', '--danger-bg'],
    // drawer.ts, saved-invoices-drawer.ts, settings-panel.ts, file-panel.ts, compliance-panel.ts.
    ['drawer close button', '--gem-900', '--bg-0'],
    ['saved invoice title', '--fg-1', '--bg-0'],
    ['saved invoice detail', '--fg-3', '--bg-0'],
    ['settings field labels', '--fg-2', '--bg-0'],
    ['file panel help text', '--fg-2', '--bg-0'],
    ['compliance panel body', '--fg-2', '--bg-0'],
    ['compliance panel hints', '--fg-3', '--bg-0'],
    ['compliance done badge', '--success-fg', '--success-bg'],
    ['compliance pending badge', '--warning-fg', '--warning-bg'],
    ['compliance neutral badge', '--fg-2', '--bg-2'],
    // toast-host.ts.
    ['toast text', '--gem-900', '--gem-100'],
    ['toast action on hover', '--gem-900', '--gem-200'],
  ];

  for (const [name, foreground, background] of pairs) {
    it(`${name} reaches ${AA_TEXT}:1`, () => {
      expect(ratio(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }
});

describe('non-text contrast (WCAG 1.4.11 AA)', () => {
  it('the focus ring is visible against the sheet', () => {
    // The ring is a box-shadow; only its colour matters for contrast.
    const ringColor = /(#[0-9a-f]{3,8}|rgba?\([^)]*\))/i.exec(token('--focus-ring'))?.[0];
    expect(ringColor).toBeDefined();
    expect(contrastRatio(ringColor as string, token('--bg-0'))).toBeGreaterThanOrEqual(
      AA_LARGE_OR_NON_TEXT,
    );
    expect(contrastRatio(ringColor as string, token('--gray-100'))).toBeGreaterThanOrEqual(
      AA_LARGE_OR_NON_TEXT,
    );
  });

  const boundaries: [name: string, border: string, background: string][] = [
    // The boundary is the only thing identifying these controls.
    ['the dashed image upload box', '--border-control', '--bg-0'],
    ['the signature lines', '--border-control', '--bg-0'],
    ['the secondary buttons', '--border-control', '--bg-0'],
    ['the settings inputs and selects', '--border-control', '--bg-0'],
    ['a focused settings input', '--border-focus', '--bg-0'],
  ];

  for (const [name, border, background] of boundaries) {
    it(`${name} reach ${AA_LARGE_OR_NON_TEXT}:1`, () => {
      expect(ratio(border, background)).toBeGreaterThanOrEqual(AA_LARGE_OR_NON_TEXT);
    });
  }
});

describe('token usage', () => {
  it('never paints text with --fg-4, which is 2.5:1 on white', () => {
    const offenders = stylesheets()
      .filter(({ css }) => /color:\s*var\(--fg-4\)/.test(css))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('never bounds an interactive control with --border-2, which is 1.5:1 on white', () => {
    const offenders = stylesheets()
      .filter(({ css }) => /border(-\w+)?:\s*[^;]*var\(--border-2\)/.test(css))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
