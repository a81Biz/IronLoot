# Evidencia — PT-083

> ⚠️ **Evidencia RECONSTRUIDA el 2026-07-27 por PT-090.** No se capturó cuando el trabajo se
> hizo: FDGE lo exige y no se cumplió. Lo que sigue es **solo lo que sigue siendo verificable
> hoy**, ejecutado y medido en el momento de escribirlo. No se reconstruye lo que se observó
> entonces y ya no puede comprobarse: eso sería falsificarla.

## Qué se comprobó

**La puerta de KYC en `withdrawals.request`.** Un usuario sin KYC aprobado no puede solicitar un
retiro: `withdrawals.service.ts:33` lanza `BadRequestException('Se requiere KYC aprobado para
retirar')`.

```
npx jest --testPathPattern="withdrawals.service"
Tests:       9 passed, 9 total
```

6 referencias a KYC en el spec, cubriendo el camino de rechazo — que es el que importa: el de
aceptación no prueba que la puerta exista.

## Lo que NO puede reconstruirse

La verificación manual contra la base de datos que se hiciera entonces.
