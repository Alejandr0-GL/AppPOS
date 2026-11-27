import { Injectable, computed, signal } from '@angular/core';

/** Color e ícono del diálogo: info (azul), warning (ámbar), danger (rojo, acciones destructivas), success (verde). */
export type DialogTone = 'info' | 'warning' | 'danger' | 'success';

export interface DialogOptions {
  title: string;
  /** Texto principal (respeta saltos de línea). */
  message?: string;
  /** Lista opcional debajo del mensaje (p. ej. productos con problemas). */
  details?: string[];
  tone?: DialogTone;
  /** Texto del botón principal. Por defecto "Aceptar". */
  confirmText?: string;
  /** Sólo en confirm(): texto del botón secundario. Por defecto "Cancelar". */
  cancelText?: string;
}

export interface DialogRequest extends DialogOptions {
  kind: 'alert' | 'confirm';
  resolve: (confirmed: boolean) => void;
}

/**
 * Reemplazo de alert()/confirm() del navegador con un diálogo propio de la app
 * (<app-dialog>, montado una sola vez en app.html). Si se piden varios a la vez se
 * muestran en orden.
 *
 *   await this.dialog.alert({ title: 'Efectivo insuficiente', message: '...', tone: 'warning' });
 *   if (!(await this.dialog.confirm({ title: '¿Anular compra?', tone: 'danger', confirmText: 'Anular' }))) return;
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly queue = signal<DialogRequest[]>([]);

  /** Diálogo visible (el primero de la cola) o null. */
  readonly current = computed(() => this.queue()[0] ?? null);

  alert(options: DialogOptions): Promise<void> {
    return this.open('alert', options).then(() => undefined);
  }

  /** Resuelve true si el usuario confirma; false si cancela, cierra o presiona Escape. */
  confirm(options: DialogOptions): Promise<boolean> {
    return this.open('confirm', options);
  }

  close(confirmed: boolean): void {
    const current = this.current();
    if (!current) return;
    this.queue.update(queue => queue.slice(1));
    current.resolve(confirmed);
  }

  private open(kind: DialogRequest['kind'], options: DialogOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.queue.update(queue => [...queue, { ...options, kind, resolve }]);
    });
  }
}
