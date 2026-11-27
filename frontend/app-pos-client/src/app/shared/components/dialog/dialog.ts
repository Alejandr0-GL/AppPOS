import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { DialogService, DialogTone } from '../../services/dialog.service';

const TONES: Record<DialogTone, { icon: string; badge: string; button: string }> = {
  info: { icon: 'i', badge: 'bg-indigo-100 text-indigo-600', button: 'bg-indigo-600 hover:bg-indigo-700' },
  warning: { icon: '!', badge: 'bg-amber-100 text-amber-600', button: 'bg-amber-500 hover:bg-amber-600' },
  danger: { icon: '!', badge: 'bg-red-100 text-red-600', button: 'bg-red-600 hover:bg-red-700' },
  success: { icon: '✓', badge: 'bg-emerald-100 text-emerald-600', button: 'bg-emerald-600 hover:bg-emerald-700' }
};

/** Diálogo global de la app (ver DialogService). Se monta una sola vez en app.html. */
@Component({
  selector: 'app-dialog',
  template: `
    @if (dialog.current(); as current) {
      <div class="fixed inset-0 z-[100] bg-slate-950/50" (click)="dismiss()"></div>
      <section class="fixed inset-x-4 top-1/2 z-[101] mx-auto w-full max-w-md -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"
               [attr.role]="current.kind === 'confirm' ? 'alertdialog' : 'dialog'" aria-modal="true"
               aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message"
               (keydown.escape)="dismiss()">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black" [class]="tone().badge" aria-hidden="true">{{ tone().icon }}</div>
          <div class="min-w-0 flex-1">
            <h3 id="app-dialog-title" class="text-lg font-black text-slate-900">{{ current.title }}</h3>
            @if (current.message) {
              <p id="app-dialog-message" class="mt-1 whitespace-pre-line text-sm text-slate-600">{{ current.message }}</p>
            }
            @if (current.details?.length) {
              <ul class="mt-2 max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-slate-700">
                @for (detail of current.details; track $index) { <li>{{ detail }}</li> }
              </ul>
            }
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2 border-t pt-3">
          @if (current.kind === 'confirm') {
            <button #cancelButton type="button" (click)="dialog.close(false)"
                    class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              {{ current.cancelText || 'Cancelar' }}
            </button>
          }
          <button #confirmButton type="button" (click)="dialog.close(true)"
                  class="rounded-lg px-5 py-2 text-sm font-bold text-white" [class]="tone().button">
            {{ current.confirmText || 'Aceptar' }}
          </button>
        </div>
      </section>
    }
  `
})
export class DialogComponent {
  readonly dialog = inject(DialogService);

  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    // Foco al abrir: Enter acepta. En acciones destructivas el foco va a "Cancelar"
    // para que un Enter accidental no anule nada.
    effect(() => {
      const current = this.dialog.current();
      if (!current) return;
      const target = current.kind === 'confirm' && current.tone === 'danger' ? this.cancelButton() : this.confirmButton();
      target?.nativeElement.focus();
    });
  }

  tone() {
    return TONES[this.dialog.current()?.tone ?? 'info'];
  }

  /** Fondo o Escape: en un confirm equivale a cancelar. */
  dismiss(): void {
    this.dialog.close(false);
  }
}
