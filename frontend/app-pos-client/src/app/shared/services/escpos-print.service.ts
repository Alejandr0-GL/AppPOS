import { Injectable, computed, signal } from '@angular/core';
import { ReceiptData } from '../models/receipt.models';

export type EscPosPaperWidth = '58mm' | '80mm';

/** Comandos ESC/POS (impresoras térmicas POS-58 / POS-80). */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Caracteres por línea según el ancho del rollo (Font A). */
const COLUMNS: Record<EscPosPaperWidth, number> = { '58mm': 32, '80mm': 48 };

export interface EscPosLine {
  text: string;
  bold?: boolean;
  /** Doble ancho + doble alto (GS ! 0x11). Ocupa la mitad de columnas. */
  big?: boolean;
  align?: 'left' | 'center' | 'right';
}

const SPECIAL_CHARS: Record<string, string> = {
  '¡': '!',
  '¿': '?',
  'º': 'o',
  'ª': 'a',
  '€': 'EUR',
  '–': '-',
  '—': '-',
  '·': '-',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'"
};

/** La impresora usa una página de códigos de 1 byte: se translitera a ASCII puro. */
function toAscii(value: string): string {
  return (value ?? '')
    .replace(/[¡¿ºª€–—·“”‘’]/g, char => SPECIAL_CHARS[char] ?? char)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '');
}

/** Corta el texto en líneas de `width` caracteres respetando palabras. */
function wrapText(value: string, width: number): string[] {
  const words = toAscii(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);

    let rest = word;
    while (rest.length > width) {
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    current = rest;
  }

  if (current) lines.push(current);
  return lines;
}

/** Dos columnas (izquierda + derecha alineada) que ocupan exactamente `width`. */
function columns(left: string, right: string, width: number): string {
  const leftText = toAscii(left);
  const rightText = toAscii(right).slice(0, Math.max(0, width - 2));
  const maxLeft = Math.max(0, width - rightText.length - 1);
  const trimmedLeft = leftText.length > maxLeft ? leftText.slice(0, maxLeft) : leftText;
  const padding = Math.max(1, width - trimmedLeft.length - rightText.length);
  return `${trimmedLeft}${' '.repeat(padding)}${rightText}`;
}

function truncate(value: string, width: number): string {
  return toAscii(value).slice(0, width);
}

function money(value: number | null | undefined): string {
  if (value == null) return '-';
  return `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDateTime(value: Date): string {
  const date = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Constructor de la secuencia binaria ESC/POS. */
class EscPosBuilder {
  private readonly bytes: number[] = [];

  raw(...values: number[]): this {
    for (const value of values) this.bytes.push(value & 0xff);
    return this;
  }

  /** ESC @ (0x1B 0x40) — inicializa la impresora. */
  initialize(): this {
    return this.raw(ESC, 0x40);
  }

  /** ESC E n (0x1B 0x45) — negritas nativas. */
  bold(enabled: boolean): this {
    return this.raw(ESC, 0x45, enabled ? 0x01 : 0x00);
  }

  /** GS ! n (0x1D 0x21) — tamaño: 0x00 normal, 0x11 doble ancho + doble alto. */
  size(mode: 'normal' | 'big'): this {
    return this.raw(GS, 0x21, mode === 'big' ? 0x11 : 0x00);
  }

  /** ESC a n (0x1B 0x61) — alineación. */
  align(position: 'left' | 'center' | 'right'): this {
    return this.raw(ESC, 0x61, position === 'left' ? 0x00 : position === 'center' ? 0x01 : 0x02);
  }

  text(value: string): this {
    for (const char of toAscii(value)) this.bytes.push(char.charCodeAt(0));
    return this;
  }

  line(value = ''): this {
    return this.text(value).raw(LF);
  }

  /** ESC d n (0x1B 0x64) — avance de papel. */
  feed(lines = 3): this {
    return this.raw(ESC, 0x64, Math.max(0, Math.min(255, lines)));
  }

  /** GS V 66 0 (0x1D 0x56 0x42 0x00) — corte parcial con avance. */
  cut(): this {
    return this.raw(GS, 0x56, 0x42, 0x00);
  }

  build(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

/**
 * Convierte el recibo en líneas ESC/POS (texto 1-bit, sin rasterizar imágenes),
 * ajustadas al ancho real del rollo (32 columnas para 58 mm, 48 para 80 mm).
 */
export function buildReceiptLines(data: ReceiptData, paperWidth: EscPosPaperWidth = '58mm'): EscPosLine[] {
  const width = COLUMNS[paperWidth] ?? COLUMNS['58mm'];
  const bigWidth = Math.floor(width / 2);
  const separator = '-'.repeat(width);
  const lines: EscPosLine[] = [];

  const push = (text: string, extra: Partial<EscPosLine> = {}) => lines.push({ text, ...extra });
  const pushWrapped = (text: string, extra: Partial<EscPosLine> = {}) => {
    for (const line of wrapText(text, width)) push(line, extra);
  };

  // Encabezado (si el nombre del negocio no cabe en tamaño destacado, va normal)
  const companyName = toAscii(data.company.name);
  const headerBig = companyName.length <= bigWidth;
  push(headerBig ? companyName : truncate(companyName, width), { bold: true, big: headerBig, align: 'center' });
  if (data.company.nit) pushWrapped(`NIT: ${data.company.nit}`, { align: 'center' });
  if (data.company.address) pushWrapped(data.company.address, { align: 'center' });
  if (data.company.phone) pushWrapped(`Tel: ${data.company.phone}`, { align: 'center' });
  if (data.company.email) pushWrapped(data.company.email, { align: 'center' });
  push(separator);
  pushWrapped(data.documentTitle.toUpperCase(), { bold: true, align: 'center' });
  push(separator);

  // Datos de la orden
  push(columns('Orden:', `#${data.orderNumber}`, width));
  push(columns('Fecha:', formatDateTime(data.issuedAt), width));
  push(columns('Cajero:', data.cashier, width));
  push(columns('Unidad:', data.sectionName, width));
  push(separator);

  // Cliente
  pushWrapped(`Cliente: ${data.customerName}`);
  push(columns(data.customerDocumentType, data.customerDocumentNumber, width));
  if (data.customerAddress) pushWrapped(`Dir: ${data.customerAddress}`);
  if (data.customerPhone) push(columns('Tel:', data.customerPhone, width));
  push(separator);

  // Ítems: descripción (con SKU) + cantidad x precio unitario + subtotal
  push(columns('CANT DESCRIPCION', 'VALOR', width), { bold: true });
  push(separator);
  for (const item of data.items) {
    pushWrapped(item.name);
    if (item.sku) push(`  ${item.sku}`);
    push(columns(`  ${item.quantity} x ${money(item.unitPrice)}`, money(item.subtotal), width));
  }
  push(separator);

  // Totales (el TOTAL va en tamaño destacado: ocupa la mitad de columnas)
  push(columns('Subtotal:', money(data.subtotal), width));
  push(columns('IVA / Impuestos:', money(data.taxAmount), width));
  push(columns('Descuentos:', money(data.discount), width));
  push(separator);
  const totalFitsBig = `TOTAL ${money(data.total)}`.length <= bigWidth;
  push(
    columns('TOTAL', money(data.total), totalFitsBig ? bigWidth : width),
    { bold: true, big: totalFitsBig }
  );
  push(separator);

  // Pago
  push(columns('Pago:', data.paymentMethod, width));
  push(columns('Recibido:', data.receivedAmount == null ? 'No registrado' : money(data.receivedAmount), width));
  push(columns('Cambio:', data.changeAmount == null ? '-' : money(data.changeAmount), width));

  if (data.status !== 'COMPLETED') push(data.status, { bold: true, align: 'center' });
  push(separator);

  // Pie
  pushWrapped(data.thanksMessage, { bold: true, align: 'center' });
  pushWrapped(data.policyMessage, { align: 'center' });
  push(`Impreso: ${formatDateTime(new Date())}`, { align: 'center' });
  push(truncate(data.company.name, width), { align: 'center' });

  return lines;
}


/** Genera el buffer ESC/POS completo (binario 1-bit) listo para enviar por USB. */
export function buildEscPosReceipt(data: ReceiptData, paperWidth: EscPosPaperWidth = '58mm'): Uint8Array {
  const builder = new EscPosBuilder();
  builder.initialize();

  for (const line of buildReceiptLines(data, paperWidth)) {
    builder
      .align(line.align ?? 'left')
      .bold(!!line.bold)
      .size(line.big ? 'big' : 'normal')
      .line(line.text);
  }

  builder
    .bold(false)
    .size('normal')
    .align('left')
    .feed(4)
    .cut();

  return builder.build();
}

/* --------------------------------------------------------------------------- */
/* WebUSB                                                                      */
/* --------------------------------------------------------------------------- */

interface UsbEndpointLike {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: string;
}

interface UsbAlternateLike {
  endpoints: UsbEndpointLike[];
}

interface UsbInterfaceLike {
  interfaceNumber: number;
  alternate: UsbAlternateLike;
}

interface UsbConfigurationLike {
  interfaces: UsbInterfaceLike[];
}

interface UsbDeviceLike {
  productName?: string;
  manufacturerName?: string;
  configuration: UsbConfigurationLike | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: Uint8Array): Promise<{ status?: string; bytesWritten?: number }>;
}

interface UsbLike {
  getDevices(): Promise<UsbDeviceLike[]>;
  requestDevice(options: { filters: Array<Record<string, number>> }): Promise<UsbDeviceLike>;
}

/** Clase impresora (0x07) y clase propietaria (0xFF, usada por POS genéricas). */
const USB_FILTERS = [{ classCode: 0x07 }, { classCode: 0xff }];

/** Tamaño de bloque para `transferOut` (algunas impresoras limitan el buffer). */
const USB_CHUNK_SIZE = 4096;


/**
 * POS-05 · Impresión nativa ESC/POS por WebUSB.
 * Si no hay impresora autorizada o la escritura falla, devuelve `false` para que
 * la UI caiga al diálogo del navegador (`window.print()` + `@media print`).
 */
@Injectable({ providedIn: 'root' })
export class EscPosPrintService {
  /** WebUSB requiere Chrome/Edge y contexto seguro (HTTPS o localhost). */
  readonly isSupported =
    typeof navigator !== 'undefined' && typeof (navigator as unknown as { usb?: unknown }).usb !== 'undefined';

  readonly printerName = signal<string | null>(null);
  readonly isPrinting = signal(false);
  readonly lastError = signal<string | null>(null);
  readonly isConnected = computed(() => this.printerName() !== null);

  private get usb(): UsbLike | null {
    return this.isSupported ? ((navigator as unknown as { usb?: UsbLike }).usb ?? null) : null;
  }

  /** ¿Existe ya una impresora autorizada para este origen? */
  async hasAuthorizedPrinter(): Promise<boolean> {
    const usb = this.usb;
    if (!usb) return false;

    try {
      const devices = await usb.getDevices();
      const device = devices[0] ?? null;
      this.printerName.set(device ? this.deviceLabel(device) : null);
      return devices.length > 0;
    } catch {
      this.printerName.set(null);
      return false;
    }
  }

  /** Abre el selector de dispositivos USB del navegador. */
  async connect(): Promise<boolean> {
    const usb = this.usb;
    if (!usb) {
      this.lastError.set('Este navegador no soporta WebUSB. Se usará la impresión del navegador.');
      return false;
    }

    try {
      const device = await usb.requestDevice({ filters: USB_FILTERS });
      this.printerName.set(this.deviceLabel(device));
      this.lastError.set(null);
      return true;
    } catch (error) {
      this.printerName.set(null);
      // Cancelar el diálogo no es un error.
      if ((error as DOMException)?.name !== 'NotFoundError') {
        this.lastError.set('No fue posible autorizar la impresora USB.');
      }
      return false;
    }
  }

  /** Olvida las impresoras autorizadas (para elegir otra). */
  async forget(): Promise<void> {
    const usb = this.usb;
    if (!usb) return;

    try {
      const devices = await usb.getDevices();
      for (const device of devices) {
        const forget = (device as unknown as { forget?: () => Promise<void> }).forget;
        await forget?.call(device);
      }
    } catch {
      /* sin permiso para olvidar: se ignora */
    }

    this.printerName.set(null);
  }

  /**
   * Imprime el recibo por USB en ESC/POS nativo.
   * Devuelve `false` si no hay impresora autorizada o falla la escritura, para que
   * la UI use el diálogo del navegador como fallback.
   */
  async printReceipt(data: ReceiptData, paperWidth: EscPosPaperWidth = '58mm'): Promise<boolean> {
    const usb = this.usb;
    if (!usb) return false;

    this.isPrinting.set(true);
    this.lastError.set(null);

    let device: UsbDeviceLike | null = null;
    let claimedInterface: number | null = null;

    try {
      const devices = await usb.getDevices();
      device = devices[0] ?? null;

      if (!device) {
        this.printerName.set(null);
        return false;
      }

      this.printerName.set(this.deviceLabel(device));

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      const target = this.findWriteTarget(device);
      if (!target) {
        this.lastError.set('La impresora no expone un canal de escritura USB (endpoint OUT).');
        return false;
      }

      claimedInterface = target.interfaceNumber;
      await device.claimInterface(target.interfaceNumber);

      const payload = buildEscPosReceipt(data, paperWidth);
      for (let offset = 0; offset < payload.length; offset += USB_CHUNK_SIZE) {
        const chunk = payload.subarray(offset, Math.min(offset + USB_CHUNK_SIZE, payload.length));
        const result = await device.transferOut(target.endpointNumber, chunk);
        if (result?.status && result.status !== 'ok') {
          throw new Error(`transferencia USB interrumpida (${result.status})`);
        }
      }

      return true;
    } catch (error) {
      this.lastError.set(`No se pudo imprimir por USB: ${this.errorMessage(error)}. Se usará la impresión del navegador.`);
      return false;
    } finally {
      if (device) {
        if (claimedInterface !== null) {
          try {
            await device.releaseInterface(claimedInterface);
          } catch {
            /* la interfaz ya no está reclamada */
          }
        }

        try {
          await device.close();
        } catch {
          /* el dispositivo ya estaba cerrado */
        }
      }

      this.isPrinting.set(false);
    }
  }

  private findWriteTarget(device: UsbDeviceLike): { interfaceNumber: number; endpointNumber: number } | null {
    const usbInterface = device.configuration?.interfaces.find(candidate =>
      candidate.alternate?.endpoints?.some(endpoint => endpoint.direction === 'out')
    );

    if (!usbInterface) return null;

    const endpoints = usbInterface.alternate.endpoints;
    const endpoint =
      endpoints.find(item => item.direction === 'out' && item.type === 'bulk') ??
      endpoints.find(item => item.direction === 'out');

    return endpoint
      ? { interfaceNumber: usbInterface.interfaceNumber, endpointNumber: endpoint.endpointNumber }
      : null;
  }

  private deviceLabel(device: UsbDeviceLike): string {
    return device.productName || device.manufacturerName || 'Impresora USB';
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'error desconocido';
  }
}

