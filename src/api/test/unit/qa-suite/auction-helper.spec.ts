import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAuctionDto } from '../../../src/modules/auctions/dto/create-auction.dto';
import { subastaValida, DURACION_MINIMA_HORAS } from '../../core/auction-helper';

/**
 * PT-131 — El helper produce un DTO que el DTO real acepta.
 *
 * Es el caso de control C1 del paquete, y su valor esta en el futuro: **si alguien endurece
 * `CreateAuctionDto`, esta prueba falla la primera** — antes que diez ficheros e2e que tardan
 * medio minuto en correr y necesitan base de datos.
 *
 * Es exactamente lo que no existia cuando se añadieron `isFutureDate` y la duracion minima de una
 * hora: los specs se quedaron atras y nadie se entero durante meses, porque el job de CI que los
 * habria ejecutado no podia terminar (H-015).
 *
 * Se valida SIN HTTP y SIN base: `class-validator` contra el DTO de verdad.
 */
describe('El helper de subasta produce un DTO valido (PT-131)', () => {
  const validar = async (obj: unknown): Promise<import('class-validator').ValidationError[]> =>
    validate(plainToInstance(CreateAuctionDto, obj), { whitelist: true });

  it('AC-01: la subasta por defecto pasa el validador real', async () => {
    expect(await validar(subastaValida())).toEqual([]);
  });

  it('AC-02: con duracion explicita de varias horas, tambien', async () => {
    expect(await validar(subastaValida({ duracionHoras: 48 }))).toEqual([]);
  });

  it('AC-03: la duracion nunca baja del minimo, aunque se pida menos', async () => {
    // Un test que pida "2 segundos" no debe poder generar un DTO invalido: el helper lo sube al
    // minimo. Para los escenarios que necesitan cierre esta `adelantarCierre()`, que mueve el
    // reloj DESPUES de crear.
    const dto = subastaValida({ duracionHoras: 0.001 });
    const horas = (Date.parse(dto.endsAt) - Date.parse(dto.startsAt)) / 3_600_000;

    expect(horas).toBeGreaterThanOrEqual(DURACION_MINIMA_HORAS);
    expect(await validar(dto)).toEqual([]);
  });

  it('AC-04: el inicio siempre queda en el futuro', async () => {
    expect(Date.parse(subastaValida().startsAt)).toBeGreaterThan(Date.now());
  });

  describe('casos de control', () => {
    it('C1: el validador RECHAZA lo que enviaban los specs viejos', async () => {
      // Sin este caso, los de arriba podrian pasar con un validador que no valide nada.
      const comoAntes = {
        title: 'x',
        description: 'y',
        startingPrice: 100,
        startsAt: new Date(Date.now() - 60_000).toISOString(), // en el pasado
        endsAt: new Date(Date.now() + 2_000).toISOString(), // 2 segundos
        images: [],
      };

      expect((await validar(comoAntes)).length).toBeGreaterThan(0);
    });

    it('C2: el validador RECHAZA una duracion por debajo del minimo', async () => {
      const corta = {
        ...subastaValida(),
        endsAt: new Date(Date.now() + 5 * 60_000).toISOString(), // 5 minutos
      };

      expect((await validar(corta)).length).toBeGreaterThan(0);
    });
  });
});
