import { createInvoice } from './invoice';
import {
  applyProfileToInvoice,
  createEmptyProfile,
  partyToProfile,
  profileToParty,
  type SellerProfile,
} from './seller-profile';

const profile: SellerProfile = {
  schemaVersion: 1,
  name: 'Taller Rodríguez',
  address: 'Calle 23 #456, La Habana',
  nit: '12345678901',
  commercialRegistry: 'REEUP 123',
  bankAccount: '0598 1234 5678',
  bankBranch: 'BANDEC 4321',
  logoAssetId: 'logo-1',
  transfermovilQrAssetId: null,
  enzonaQrAssetId: 'qr-2',
};

describe('seller profile', () => {
  it('starts empty and versioned', () => {
    expect(createEmptyProfile()).toEqual({
      schemaVersion: 1,
      name: '',
      address: '',
      nit: '',
      commercialRegistry: '',
      bankAccount: '',
      bankBranch: '',
      logoAssetId: null,
      transfermovilQrAssetId: null,
      enzonaQrAssetId: null,
    });
  });

  it('becomes a seller party without an identity card', () => {
    expect(profileToParty(profile)).toEqual({
      name: 'Taller Rodríguez',
      address: 'Calle 23 #456, La Habana',
      nit: '12345678901',
      identityCard: '',
      commercialRegistry: 'REEUP 123',
      bankAccount: '0598 1234 5678',
      bankBranch: 'BANDEC 4321',
    });
  });

  it('takes the six text fields from a party and keeps the asset ids of the base profile', () => {
    const party = {
      name: 'Ana Pérez',
      address: 'Ave. 51, Marianao',
      nit: '98765432109',
      identityCard: '85010112345',
      commercialRegistry: 'RC 77',
      bankAccount: '0300 9876 5432',
      bankBranch: 'BPA 1',
    };

    expect(partyToProfile(party, profile)).toEqual({
      ...profile,
      name: 'Ana Pérez',
      address: 'Ave. 51, Marianao',
      nit: '98765432109',
      commercialRegistry: 'RC 77',
      bankAccount: '0300 9876 5432',
      bankBranch: 'BPA 1',
    });
  });

  it('copies the profile into the seller block and asset ids of an invoice, leaving the rest alone', () => {
    const invoice = createInvoice('inv-1');
    invoice.buyer.name = 'Ana Pérez';

    const filled = applyProfileToInvoice(invoice, profile);

    expect(filled.seller).toEqual(profileToParty(profile));
    expect(filled.logoAssetId).toBe('logo-1');
    expect(filled.transfermovilQrAssetId).toBeNull();
    expect(filled.enzonaQrAssetId).toBe('qr-2');
    expect(filled.buyer.name).toBe('Ana Pérez');
    expect(filled.id).toBe('inv-1');
    expect(invoice.seller.name).toBe('');
  });
});
