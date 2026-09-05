import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import axe from 'axe-core';
import { App } from './app';
import { FakeSwUpdate } from './core/testing/fake-sw-update';

describe('App accessibility', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: SwUpdate, useValue: new FakeSwUpdate() }],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  it('passes axe with no violations', async () => {
    // jsdom has no layout engine, so it cannot compute contrast; every other rule runs.
    const results = await axe.run(fixture.nativeElement as HTMLElement, {
      rules: { 'color-contrast': { enabled: false } },
    });

    const summary = results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.help}\n` +
        violation.nodes.map((node) => `  ${node.target.join(' ')}`).join('\n'),
    );
    expect(summary).toEqual([]);
    // Guards against a silent no-op: an empty violation list only counts if rules actually ran.
    expect(results.passes.length).toBeGreaterThan(10);
  }, 30_000);
});
