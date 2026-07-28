import { plainToInstance } from 'class-transformer';
import { UsersService } from '../../../src/modules/users/users.service';
import { UserSettingsDto } from '../../../src/modules/users/dto/user-settings.dto';

/**
 * PT-132 (PTSA H-019) — Un `PATCH` parcial no puede borrar lo que no envías.
 *
 * Observado contra el sistema en marcha, con sesión real:
 *
 *     ANTES   {"language":"es","notifications":{"email":true,"inApp":true}}
 *     PATCH   {"language":"en"}
 *     DESPUES {"language":"en"}                     <- notifications BORRADO
 *
 * La causa no es `deepMerge`, que está bien escrito. Es lo que le llega: `main.ts` configura el
 * `ValidationPipe` con `transform: true`, así que el `dto` no es un objeto plano sino una
 * **instancia de clase con todas las propiedades declaradas como claves propias** — las ausentes,
 * con valor `undefined`. `Object.keys()` las incluye, y la rama se sobreescribe con `undefined`.
 *
 * Pérdida silenciosa de datos: la petición devuelve 200 y el usuario no se entera hasta que dejan
 * de llegarle los avisos. Y `notifications` gobierna exactamente eso — en una plataforma de
 * subastas, es perderse que te han superado la puja.
 *
 * **El e2e llevaba meses diciéndolo** y nadie lo escuchaba, porque el job de CI que lo habría
 * ejecutado no podía terminar (H-015). Esta prueba lo fija a un nivel donde no hace falta base de
 * datos para verlo.
 */
describe('Un PATCH parcial conserva las ramas que no envia (PT-132)', () => {
  // `deepMerge` es privado; se prueba a través del acceso indexado, sin instanciar el servicio
  // entero (necesitaría Prisma, auditoría y contexto).
  const mezclar = (destino: unknown, origen: unknown): unknown =>
    (UsersService.prototype as unknown as Record<string, (a: unknown, b: unknown) => unknown>)[
      'deepMerge'
    ](destino, origen);

  const guardado = {
    language: 'es',
    notifications: { email: true, inApp: true },
  };

  it('AC-01: cambiar el idioma conserva las notificaciones', () => {
    // El caso EXACTO que se observó roto contra el sistema en marcha.
    const dto = plainToInstance(UserSettingsDto, { language: 'en' });

    expect(mezclar(guardado, dto)).toEqual({
      language: 'en',
      notifications: { email: true, inApp: true },
    });
  });

  it('AC-02: cambiar una notificacion conserva su hermana y el idioma', () => {
    const dto = plainToInstance(UserSettingsDto, { notifications: { email: false } });

    expect(mezclar(guardado, dto)).toEqual({
      language: 'es',
      notifications: { email: false, inApp: true },
    });
  });

  it('AC-03: un valor false SI se aplica — no se confunde con ausente', () => {
    // La correccion descarta `undefined`, no los valores falsy. Confundirlos seria un defecto
    // nuevo: nadie podria desactivar una notificacion.
    const dto = plainToInstance(UserSettingsDto, { notifications: { email: false, inApp: false } });

    expect(mezclar(guardado, dto)).toEqual({
      language: 'es',
      notifications: { email: false, inApp: false },
    });
  });

  describe('casos de control', () => {
    it('C1: una clave presente con `undefined` NO borra la rama', () => {
      // Es la forma exacta que produce `transform: true`. Sin la correccion, esto devolvia
      // `{ language: 'es', notifications: undefined }`.
      const conUndefined = { language: undefined, notifications: { email: false } };

      expect(mezclar(guardado, conUndefined)).toEqual({
        language: 'es',
        notifications: { email: false, inApp: true },
      });
    });

    it('C2: un objeto plano parcial se comporta igual que la instancia del DTO', () => {
      // Si estos dos divergieran, la correccion dependeria de como se construya el dto.
      const plano = mezclar(guardado, { language: 'en' });
      const instancia = mezclar(guardado, plainToInstance(UserSettingsDto, { language: 'en' }));

      expect(plano).toEqual(instancia);
    });
  });
});
