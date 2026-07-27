# PT-120 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `feature/PT-120-domain-rules-as-code` ·
**Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios verificados?** Los seis de `PLAN_ACTUAL.md` §5.
- [x] **¿Escenarios pasando?** DR-01…DR-06 (6/6) y las tres verificaciones de punta a punta.
- [x] **¿Efectos colaterales?** Sólo lee. La violación inyectada se restauró y se comprobó.
- [x] **¿Commit atómico?** Uno.
- [x] **¿Sin artefactos?** Sí.
- [x] **¿Documentación actualizada?** `audit-scope.yaml` dice dónde corre D1.N1.

## Lo que este PT arregla, y no es una regla

Las quince reglas de F-1 **ya se habían verificado tres veces** —DS-004, DS-006, DS-008— con
guiones que escribí en una carpeta temporal y perdí. Cada delta sync rehacía el mismo trabajo.

`[R57]` existe exactamente para eso, y llevaba desde el 23-jun declarado en `audit-scope.yaml` sin
cumplirse. Lo que faltaba no era saber verificar: era **poder volver a verificar**.

## Lo que el catálogo dice y mi cálculo a mano no decía

DS-008 dio `rubric = 100`. El catálogo da el mismo 100, pero además:

```
Sin datos (fuera del denominador): R-5.1a, R-5.1d
```

Dos reglas **no tenían productos que evaluar** — la última corrida de QA truncó las subastas
cerradas. Mi cálculo manual las contó como cumplidas sin notarlo.

El resultado no cambia, pero **la afirmación sí**: «100 sobre doce reglas aplicables, dos sin
datos» no es lo mismo que «100 sobre catorce».

## La decisión que más me costó

`SIN_DATOS` **fuera del denominador**. Contarlas como cumplidas infla el número; como violadas, lo
hunde. Ninguna de las dos es cierta, y las dos son más cómodas que admitir que no se pudo mirar.

Y el caso límite —todas sin datos— devuelve `null`, no `100`. Un catálogo que da verde sobre una
base vacía es de la misma familia que el `catch` mudo de F-34.

## Lo que NO entra, y por qué

`[R57]` dice que las reglas que exigen juicio «permanecen como evaluación reproducible documentada,
no como código». **CR-007** (ventana de disputa) y **CR-008** (firma HMAC) no entran: su entrada no
es el producto sino la petición. Viven en `ventana-desde-la-entrega.spec.ts` y en la fase 70.

Forzarlas al catálogo habría sido inventar un veredicto sobre algo que no se está midiendo.
