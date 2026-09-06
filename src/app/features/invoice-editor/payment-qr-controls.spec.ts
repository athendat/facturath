import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectUrls } from '../../core/object-urls';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import { PaymentQrControls } from './payment-qr-controls';

describe('PaymentQrControls', () => {
  let fixture: ComponentFixture<PaymentQrControls>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentQrControls],
      providers: [{ provide: ObjectUrls, useValue: new FakeObjectUrls() }],
    }).compileComponents();
    fixture = TestBed.createComponent(PaymentQrControls);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('offers the Transfermóvil and EnZona QR controls in that order', () => {
    expect(
      Array.from(element.querySelectorAll('input[type="file"]')).map((input) =>
        input.getAttribute('aria-label'),
      ),
    ).toEqual(['Subir QR Transfermóvil', 'Subir QR EnZona']);
  });
});
