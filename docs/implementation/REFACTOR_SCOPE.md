# REFACTOR_SCOPE — PT-125: bcrypt 5->6 y uuid 9->14

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Variante**: STATE 1-R
**Origen**: PT-123 / TD-015 / H-008. Dos de los tres saltos que el analisis recomendo hacer ya.
**Autorizacion**: el humano autorizo la migracion el 2026-07-27 («si la migracion es lo que se
necesita para mejorar la seguridad... mejor ahora que parchar»).

## Que cambia

| Paquete | De | A | Aviso que cierra |
|---|---|---|---|
| `bcrypt` | 5.1.1 | 6.0.0 | `tar` CRITICA (via `@mapbox/node-pre-gyp`) |
| `uuid` | 9.0.1 | 14.0.1 | `uuid` MODERADA (bounds check en v3/v5/v6) |

## Que NO cambia

- **Ningun hash existente.** El formato bcrypt (`$2b$rondas$sal+hash`) es un estandar; la libreria
  cambia, el formato no. Si esto fuera falso, todos los usuarios quedarian fuera.
- **Ninguna llamada.** `bcrypt.hash` / `bcrypt.compare` y `import { v4 as uuidv4 }` tienen la misma
  firma en las versiones destino.
- **El numero de rondas.** Se deja el que hay; cambiarlo es otra decision y se notaria en el tiempo
  de login.
- **NestJS y Express.** Son PT-126. Deliberadamente separados: si algo se rompe, hay que poder
  saber cual de los dos fue.

## Superficie medida

```
bcrypt   src/modules/auth/auth.service.ts   unico fichero
         bcrypt.hash    x3
         bcrypt.compare x2
uuid     solo v4 (7 usos de `uuidv4`, 4 de `v4`)
         v1/v3/v5/v6: CERO — los 12 «v1» del grep son rutas /api/v1
```

Que solo se use v4 importa: el aviso de `uuid` es **exclusivamente** de v3/v5/v6 con `buf`. Se sube
igual —cierra el aviso y quita una excepcion que explicar— pero el riesgo que se elimina era nulo.
Esto se dice aqui para que nadie lo lea como un parche urgente.

## Quality bar — como se sabe que esta completo

1. Un hash generado con **bcrypt 5** sigue validando con **bcrypt 6**. Esta es LA prueba: se congela
   un hash como fixture ANTES de subir y se comprueba despues.
2. `npm audit --omit=dev` baja de 12 paquetes a 10.
3. Las 552 pruebas unitarias siguen pasando.
4. Un login real contra el API en ejecucion, con un usuario **creado antes** de la subida.

## Riesgo de regresion — que debe conservarse exacto

| Riesgo | Por que importa | Como se comprueba |
|---|---|---|
| **Hashes existentes dejan de validar** | Todos los usuarios fuera. Es el unico riesgo grave | Fixture congelado + login real con usuario preexistente |
| `bcrypt` 6 exige Node >= 18 | El contenedor podria no arrancar | `node -v` en la imagen antes de subir |
| `bcrypt` es nativo: compila en `npm install` | Si falla la compilacion, la imagen no se construye | `docker-compose build api` |
| `uuid` 11+ cambio el empaquetado (ESM/CJS dual) | Un import roto se ve al compilar | `npm run typecheck` + arranque real |

## Estrategia de vuelta atras

Cada paquete, su propio commit. `package.json` + `package-lock.json` revertidos devuelven el estado
anterior sin tocar datos: **ningun hash se reescribe**, asi que volver atras es seguro en cualquier
momento. Es la razon de subirlos por separado y no junto con PT-126.

## Fuera de alcance

- Cambiar el numero de rondas de bcrypt.
- Migrar a `argon2` u otro algoritmo. Es una decision de seguridad con migracion de datos detras.
- Sustituir `uuid` por `crypto.randomUUID()` del runtime (haria la dependencia innecesaria). Tiene
  sentido y es un PT propio: toca 11 puntos y no cierra ningun aviso adicional.


---

## Delta: lo que cambio respecto a este alcance, y por que

**El alcance decia que quitar `uuid` a favor de `crypto.randomUUID()` era «fuera de alcance, PT
propio». Se hizo aqui.** Lo que lo cambio fue una medida, no una preferencia:

1. `uuid@14` **es ESM**. Jest no lo parsea: 54 de 79 suites dejaron de arrancar.
2. Y sobre todo: **el aviso nunca fue de nuestra dependencia**. El rango vulnerable es `<11.1.1` y
   el unico nodo afectado era `node_modules/mercadopago/node_modules/uuid`. Subir la nuestra a 14
   no cerraba nada — solo añadia una segunda copia y rompia las pruebas.

La salida buena no era configurar transformaciones de Jest para conservar una dependencia que no
hacia falta. `crypto.randomUUID()` es v4 del propio runtime, con el mismo CSPRNG, en 4 ficheros.
**Un paquete menos en el arbol es un aviso que no puede volver.**

La copia de `mercadopago` se resuelve con `override: uuid ^11.1.1` — la **minima parcheada**, no la
ultima. La 14 tambien cierra el aviso y volveria a romper Jest dentro del arbol de `mercadopago`.
Elegir la ultima porque si era el error de la primera vuelta.

## Resultado medido

| | Antes | Despues |
|---|--:|--:|
| Paquetes con aviso propio | 12 | **10** |
| Criticos | 1 (`tar`) | **0** |
| Pruebas unitarias API | 552 | **561** |

Verificado contra el API en ejecucion: un usuario **creado antes** de la subida, con hash `$2b$12$`
escrito por bcrypt 5, entra con bcrypt 6 (HTTP 200) y la contraseña equivocada sigue dando 401.
