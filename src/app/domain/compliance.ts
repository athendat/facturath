/**
 * The 13 data points Resolución 55/2021 (Ministerio de Finanzas y Precios) requires on an
 * invoice, each with the rule that decides whether the open invoice fulfils it and the
 * first field to fill when it does not. The labels are the resolution's own wording.
 */

import type { Carrier, Invoice, Party, Signatures } from './invoice';
import { isPositiveNumber } from './money';
import { computeTotals } from './totals';

/**
 * Names one editable control of the document: a scalar of the invoice, a `section.field`
 * pair, or `lines.<index>.<field>`. `fieldElementId` turns it into the control's DOM id.
 */
export type FieldId =
  | 'issueDate'
  | 'series'
  | 'number'
  | 'concept'
  | `seller.${keyof Party}`
  | `buyer.${keyof Party}`
  | `carrier.${keyof Carrier}`
  | `signatures.${keyof Signatures}`
  | 'tax.name'
  | 'tax.percent'
  | `lines.${number}.description`
  | `lines.${number}.unit`
  | `lines.${number}.quantity`
  | `lines.${number}.unitPrice`;

export type ComplianceState = 'fulfilled' | 'pending' | 'not-applicable';

export interface ComplianceEntry {
  id: string;
  /** The data point as the resolution words it. */
  label: string;
  /** Where FACTURATH captures it. */
  where: string;
  state: ComplianceState;
  /** The first field still missing; null unless the entry is pending. */
  focusField: FieldId | null;
}

export interface ComplianceOptions {
  showCarrier: boolean;
  showSignatures: boolean;
}

/** The DOM id of the control bound to `fieldId`, e.g. `field-seller-name`, `field-lines-0-unit-price`. */
export function fieldElementId(fieldId: FieldId): string {
  return `field-${fieldId.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replaceAll('.', '-')}`;
}

function filled(text: string): boolean {
  return text.trim() !== '';
}

/** The first of `fields` that is empty, as the focus target, or null when all are filled. */
function firstMissing<T extends FieldId>(fields: readonly [T, string][]): T | null {
  return fields.find(([, value]) => !filled(value))?.[0] ?? null;
}

function partyFields(role: 'seller' | 'buyer', party: Party, keys: readonly (keyof Party)[]) {
  return keys.map((key) => [`${role}.${key}`, party[key]] as [FieldId, string]);
}

const SIGNATURES: readonly { id: string; label: string; field: keyof Signatures }[] = [
  { id: 'signature-delivers', label: 'Nombre y firma de quien entrega y fecha de la entrega.', field: 'delivers' },
  { id: 'signature-receives', label: 'Nombre y firma de quien recibe y fecha de recepción.', field: 'receives' },
  { id: 'signature-carrier', label: 'Nombre y firma del transportador y fecha de recepción.', field: 'carrier' },
  { id: 'signature-books', label: 'Nombre y firma de quien contabiliza la factura.', field: 'books' },
];

const SIGNATURES_WHERE = 'Sección Firmas (opcional)';

const CARRIER_LABEL =
  'Nombre, identidad, matrícula, carta de porte y casilla del ferrocarril del transportista.';
const CARRIER_WHERE = 'Sección Transportista (opcional)';

/** The 13 entries, always in the resolution's order and with stable ids. */
export function checkCompliance(invoice: Invoice, options: ComplianceOptions): ComplianceEntry[] {
  const { seller, buyer, carrier, lines, tax, signatures } = invoice;
  const buyerIdentity = filled(buyer.nit) || filled(buyer.identityCard) ? null : ('buyer.nit' as const);

  return [
    entry('issue-date', 'Fecha de emisión.', 'Encabezado · fecha', firstMissing([['issueDate', invoice.issueDate]])),
    entry(
      'seller',
      'Nombre, dirección, REEUP/ONEI, cuenta y sucursal bancaria, NIT y registro comercial del proveedor.',
      'Encabezado · tus datos',
      firstMissing(
        partyFields('seller', seller, ['name', 'address', 'nit', 'commercialRegistry', 'bankAccount', 'bankBranch']),
      ),
    ),
    entry(
      'buyer',
      'Los mismos datos del comprador; personas naturales, número de identidad permanente.',
      'Bloque Comprador',
      firstMissing(partyFields('buyer', buyer, ['name', 'address'])) ?? buyerIdentity,
    ),
    entry(
      'concept',
      'Espacio para especificar el concepto de las operaciones.',
      'Bloque Concepto de la operación',
      firstMissing([['concept', invoice.concept]]),
    ),
    options.showCarrier
      ? entry(
          'carrier',
          CARRIER_LABEL,
          CARRIER_WHERE,
          firstMissing([
            ['carrier.name', carrier.name],
            ['carrier.identityCard', carrier.identityCard],
            ['carrier.plate', carrier.plate],
          ]),
        )
      : notApplicable('carrier', CARRIER_LABEL, CARRIER_WHERE),
    entry(
      'lines',
      'Código, descripción, unidad de medida, cantidad, precio unitario e importe.',
      'Tabla de líneas',
      firstMissingLineField(lines),
    ),
    entry(
      'tax',
      'Tipo impositivo y porciento.',
      'Totales · impuesto',
      firstMissing([
        ['tax.name', tax.name],
        ['tax.percent', tax.percent],
      ]),
    ),
    entry(
      'total',
      'Importe total, subtotal cuando corresponda y moneda de pago.',
      'Totales y selector de moneda',
      computeTotals(invoice).total > 0 ? null : 'lines.0.unitPrice',
    ),
    ...SIGNATURES.map(({ id, label, field }) =>
      options.showSignatures
        ? entry(id, label, SIGNATURES_WHERE, firstMissing([[`signatures.${field}`, signatures[field]]]))
        : notApplicable(id, label, SIGNATURES_WHERE),
    ),
    entry(
      'number',
      'Número consecutivo del modelo.',
      'Encabezado · serie y número',
      firstMissing([
        ['series', invoice.series],
        ['number', invoice.number],
      ]),
    ),
  ];
}

/** Every line needs a description, a unit, a quantity above zero and a unit price; the code is optional. */
function firstMissingLineField(lines: Invoice['lines']): FieldId | null {
  for (const [index, line] of lines.entries()) {
    if (!filled(line.description)) {
      return `lines.${index}.description`;
    }
    if (!filled(line.unit)) {
      return `lines.${index}.unit`;
    }
    if (!isPositiveNumber(line.quantity)) {
      return `lines.${index}.quantity`;
    }
    if (!filled(line.unitPrice)) {
      return `lines.${index}.unitPrice`;
    }
  }
  return null;
}

function entry(id: string, label: string, where: string, missing: FieldId | null): ComplianceEntry {
  return { id, label, where, state: missing === null ? 'fulfilled' : 'pending', focusField: missing };
}

function notApplicable(id: string, label: string, where: string): ComplianceEntry {
  return { id, label, where, state: 'not-applicable', focusField: null };
}

export function countPending(entries: readonly ComplianceEntry[]): number {
  return entries.filter((item) => item.state === 'pending').length;
}
