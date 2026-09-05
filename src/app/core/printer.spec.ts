import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Printer } from './printer';

describe('Printer', () => {
  it('opens the print dialog of the window that owns the document', () => {
    const print = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { print } } }],
    });

    TestBed.inject(Printer).print();

    expect(print).toHaveBeenCalledOnce();
  });
});
