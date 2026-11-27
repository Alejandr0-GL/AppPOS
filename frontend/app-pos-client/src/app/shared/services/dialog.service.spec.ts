import { TestBed } from '@angular/core/testing';
import { DialogService } from './dialog.service';

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DialogService);
  });

  it('confirm resuelve true al aceptar y false al cancelar', async () => {
    const accepted = service.confirm({ title: 'A' });
    service.close(true);
    expect(await accepted).toBe(true);

    const cancelled = service.confirm({ title: 'B' });
    service.close(false);
    expect(await cancelled).toBe(false);
    expect(service.current()).toBeNull();
  });

  it('muestra los diálogos en orden cuando se piden varios a la vez', async () => {
    const first = service.alert({ title: 'Primero' });
    const second = service.confirm({ title: 'Segundo' });

    expect(service.current()?.title).toBe('Primero');
    service.close(true);
    await first;

    expect(service.current()?.title).toBe('Segundo');
    expect(service.current()?.kind).toBe('confirm');
    service.close(true);
    expect(await second).toBe(true);
    expect(service.current()).toBeNull();
  });

  it('close sin diálogo abierto no hace nada', () => {
    expect(() => service.close(true)).not.toThrow();
    expect(service.current()).toBeNull();
  });
});
