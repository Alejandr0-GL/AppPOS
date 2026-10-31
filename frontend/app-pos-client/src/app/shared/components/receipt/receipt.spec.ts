import { TestBed } from '@angular/core/testing';
import { ReceiptComponent } from './receipt';
import { ReceiptData } from '../../models/receipt.models';
import { COMPANY_INFO } from '../../config/company.config';
import { environment } from '../../../../environments/environment';

const data: ReceiptData = {
  company: { name: 'AppPOS Soluciones', nit: '901.234.567-8', address: 'Calle 45 # 12-34', phone: '+57 604 322 1188' },
  documentTitle: 'Ticket POS / Factura de venta',
  orderNumber: 42,
  issuedAt: new Date('2026-10-30T10:15:00'),
  cashier: 'admin',
  sectionName: 'Lubricentro',
  customerName: 'Juan Pérez',
  customerDocumentType: 'C.C.',
  customerDocumentNumber: '10203040',
  customerAddress: 'Calle 10 # 20-30',
  customerPhone: '3001234567',
  items: [
    { quantity: 2, name: 'Cambio de aceite', sku: 'SRV-ACEITE', unitPrice: 50000, subtotal: 119000, taxAmount: 19000 }
  ],
  subtotal: 100000,
  taxAmount: 19000,
  discount: 0,
  total: 119000,
  paymentMethod: 'Efectivo',
  receivedAmount: 120000,
  changeAmount: 1000,
  status: 'COMPLETED',
  thanksMessage: '¡Gracias por su compra!',
  policyMessage: 'Cambios dentro de los 30 días.'
};

function createComponent(success = false) {
  const fixture = TestBed.createComponent(ReceiptComponent);
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('success', success);
  fixture.detectChanges();
  return fixture;
}

describe('ReceiptComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceiptComponent]
    }).compileComponents();
  });

  it('renderiza el ticket con encabezado, ítems, totales y pie', () => {
    const fixture = createComponent();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('AppPOS Soluciones');
    expect(text).toContain('NIT: 901.234.567-8');
    expect(text).toContain('Ticket POS / Factura de venta');
    expect(text).toContain('#42');
    expect(text).toContain('Cambio de aceite');
    // El SKU se imprime sin la etiqueta "SKU " para no consumir ancho de línea.
    expect(text).toContain('SRV-ACEITE');
    expect(text).not.toContain('SKU SRV-ACEITE');
    expect(text).toContain('TOTAL');
    expect(text).toContain('Recibido');
    expect(text).toContain('Cambio');
    expect(text).toContain('¡Gracias por su compra!');
    expect(text).toContain('Cambios dentro de los 30 días.');
  });

  it('marca el contenedor imprimible y arranca en rollo de 58 mm sin selector visible', () => {
    const fixture = createComponent();
    const element = fixture.nativeElement as HTMLElement;
    const paper = element.querySelector('.receipt-print-area');

    expect(paper).toBeTruthy();
    expect(paper?.classList.contains('receipt-paper--58')).toBe(true);
    expect(paper?.classList.contains('receipt-paper--80')).toBe(false);
    // El selector de rollo queda oculto hasta que exista configuración global de impresora.
    expect(element.textContent).not.toContain('80 mm');
    expect(element.querySelectorAll('.receipt-header').length).toBe(1);
    expect(element.querySelectorAll('.receipt-footer').length).toBe(1);
  });

  it('mantiene la API preparada para cambiar de rollo (58/80 mm)', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.setPaper('80');
    fixture.detectChanges();

    const paper = (fixture.nativeElement as HTMLElement).querySelector('.receipt-print-area');
    expect(paper?.classList.contains('receipt-paper--80')).toBe(true);
    expect(paper?.classList.contains('receipt-paper--58')).toBe(false);
  });

  it('renderiza las acciones del modal: imprimir y cerrar', () => {
    const reprint = createComponent(false);
    const reprintButtons = Array.from((reprint.nativeElement as HTMLElement).querySelectorAll('button')).map(button => button.textContent?.trim());
    expect(reprintButtons.some(label => label?.includes('Imprimir recibo'))).toBe(true);
    expect(reprintButtons.some(label => label === 'Cerrar')).toBe(true);

    const afterSale = createComponent(true);
    const saleButtons = Array.from((afterSale.nativeElement as HTMLElement).querySelectorAll('button')).map(button => button.textContent?.trim());
    expect(saleButtons.some(label => label === 'Cerrar')).toBe(true);
    expect(saleButtons.some(label => label === 'Nueva venta')).toBe(false);
  });

  it('cierra al hacer clic fuera de la tarjeta (fondo del modal)', () => {
    const fixture = createComponent();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => (closed += 1));

    const element = fixture.nativeElement as HTMLElement;
    const overlay = element.querySelector('.receipt-overlay') as HTMLElement;
    const card = element.querySelector('.receipt-shell') as HTMLElement;

    card.click();
    expect(closed).toBe(0);

    overlay.click();
    expect(closed).toBe(1);
  });

  it('muestra la confirmación de venta solo cuando success es true', () => {
    const withoutBanner = createComponent(false);
    expect((withoutBanner.nativeElement as HTMLElement).textContent).toContain('Recibo de venta');
    expect((withoutBanner.nativeElement as HTMLElement).textContent).not.toContain('Venta completada');

    const withBanner = createComponent(true);
    expect((withBanner.nativeElement as HTMLElement).textContent).toContain('¡Venta completada!');
  });

  it('emite el evento closed al cerrar', () => {
    const fixture = createComponent();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance.close();

    expect(closed).toBe(true);
  });

  it('toma los datos de la empresa desde environment.company', () => {
    const expectedName = environment.company.name.trim() || 'Punto de venta';

    expect(COMPANY_INFO.name).toBe(expectedName);
    expect(COMPANY_INFO.nit).toBe(environment.company.nit.trim());
    expect(COMPANY_INFO.email).toBe(environment.company.email.trim() || undefined);
  });

  it('omite las líneas de la empresa que vienen vacías (build de producción)', () => {
    const fixture = TestBed.createComponent(ReceiptComponent);
    fixture.componentRef.setInput('data', {
      ...data,
      company: { name: 'Punto de venta', nit: '', address: '', phone: '', email: undefined }
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Punto de venta');
    expect(text).not.toContain('NIT:');
    expect(text).not.toContain('Calle 45');
  });
});
