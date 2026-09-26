import { TestBed } from '@angular/core/testing';
import { PhoneLayout } from '../../core/phone-layout';
import { ZoneSheets } from './zone-sheets';

describe('ZoneSheets on a phone', () => {
  let sheets: ZoneSheets;
  const added: HTMLElement[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PhoneLayout, useValue: { active: () => true } }],
    });
    sheets = TestBed.inject(ZoneSheets);
  });

  afterEach(() => {
    added.splice(0).forEach((element) => element.remove());
  });

  function add(tag: string, id: string): HTMLElement {
    const element = document.createElement(tag);
    element.id = id;
    document.body.appendChild(element);
    added.push(element);
    return element;
  }

  it('focuses the zone and opens its sheet once the phone document is there', () => {
    const zone = add('button', 'zone-buyer');

    sheets.reveal('buyer.name');

    expect(document.activeElement).toBe(zone);
    expect(sheets.current()).toBe('buyer');
  });

  // The zones are prerendered with the page (#69), so this guards a state a phone should not
  // reach: no sheet is opened with no zone to give focus back to.
  it('falls back to the inline field when the zone is not in the page', () => {
    const inline = add('input', 'field-buyer-name');

    sheets.reveal('buyer.name');

    expect(document.activeElement).toBe(inline);
    expect(sheets.current()).toBeNull();
  });
});
