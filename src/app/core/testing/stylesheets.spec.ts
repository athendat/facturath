import { appColorDeclarations, parseColorDeclarations } from './stylesheets';

describe('parseColorDeclarations', () => {
  it('finds a colour-bearing declaration and keeps its selector', () => {
    const css = `
      .title {
        margin: 0;
        color: var(--fg-3);
        font-size: 9px;
      }
    `;

    expect(parseColorDeclarations(css, 'fixture.css')).toEqual([
      { source: 'fixture.css', selector: '.title', property: 'color', value: 'var(--fg-3)' },
    ]);
  });

  it('ignores declarations that paint nothing', () => {
    const css = `
      input {
        border: 0;
        background: transparent;
        color: inherit;
        outline: none;
        box-shadow: none;
        padding: 4px;
      }
    `;

    expect(parseColorDeclarations(css, 'fixture.css')).toEqual([]);
  });

  it('finds literal colours as well as tokens', () => {
    const css = `.overlay { background: rgba(17, 24, 39, 0.35); }`;

    expect(parseColorDeclarations(css, 'fixture.css')).toEqual([
      {
        source: 'fixture.css',
        selector: '.overlay',
        property: 'background',
        value: 'rgba(17, 24, 39, 0.35)',
      },
    ]);
  });

  it('reads the innermost rule of a nested at-rule, with its own selector', () => {
    const css = `
      @media (min-width: 40rem) {
        .add {
          background: var(--gem-50);
        }
      }
    `;

    expect(parseColorDeclarations(css, 'fixture.css')).toEqual([
      { source: 'fixture.css', selector: '.add', property: 'background', value: 'var(--gem-50)' },
    ]);
  });

  it('skips print rules, which paint ink on paper rather than a screen', () => {
    const css = `
      @media print {
        .sheet {
          background: var(--bg-0);
          color: var(--fg-1);
        }
      }
    `;

    expect(parseColorDeclarations(css, 'fixture.css')).toEqual([]);
  });

  it('drops comments before parsing', () => {
    const css = `
      /* color: var(--fg-4); */
      .real {
        color: var(--fg-1);
      }
    `;

    expect(parseColorDeclarations(css, 'fixture.css')).toEqual([
      { source: 'fixture.css', selector: '.real', property: 'color', value: 'var(--fg-1)' },
    ]);
  });

  it('splits a grouped selector into one declaration per selector', () => {
    const css = `
      .delete:focus-visible,
      .add:focus-visible {
        box-shadow: var(--focus-ring);
      }
    `;

    expect(parseColorDeclarations(css, 'fixture.css')).toEqual([
      {
        source: 'fixture.css',
        selector: '.delete:focus-visible',
        property: 'box-shadow',
        value: 'var(--focus-ring)',
      },
      {
        source: 'fixture.css',
        selector: '.add:focus-visible',
        property: 'box-shadow',
        value: 'var(--focus-ring)',
      },
    ]);
  });
});

describe('appColorDeclarations', () => {
  it('reads the global stylesheet, the shell and every component styles block', () => {
    const declarations = appColorDeclarations();
    const sources = new Set(declarations.map((declaration) => declaration.source));

    expect(sources).toContain('src/styles.css');
    expect(sources).toContain('src/app/app.css');
    // A component whose CSS lives in a `styles:` template literal.
    expect(sources).toContain('src/app/shared/ui/inline-input.ts');
    // A component whose CSS lives in its own file.
    expect(sources).toContain('src/app/features/invoice-editor/line-items-table.css');
  });

  it('finds the placeholder colour inside a component styles block', () => {
    expect(appColorDeclarations()).toContainEqual({
      source: 'src/app/shared/ui/inline-input.ts',
      selector: 'input::placeholder',
      property: 'color',
      value: 'var(--fg-placeholder)',
    });
  });
});
