# PT-147 — Evidencia: los ocho jobs, en verde

> En `.md` por **F-136-A**.

## El resultado

Corrida **30419830383** — `GLOBAL: success`.

| Job | Historia hasta el 2026-07-28 | Hoy |
|---|:--:|:--:|
| `lint` | nunca ejecutado | ✅ |
| `security-audit` (D2) | nunca | ✅ |
| `schema-drift` (D2) | nunca | ✅ |
| `observabilidad` (D3) | nunca | ✅ |
| `test-unit` | nunca | ✅ |
| `test-integration` | nunca | ✅ |
| `build` | nunca | ✅ |
| **`docker`** | **nunca** | **✅** |

**Es la primera vez que los ocho se ejecutan y terminan en verde.** Hace unas horas el contador de
ejecuciones del repositorio era `0`.

## Las cuatro imágenes

```
ironloot-admin-ci  -> healthy
ironloot-base-ci   -> healthy
ironloot-client-ci -> healthy
ironloot-api-ci    -> healthy
```

Y las migraciones, aplicadas **por la propia imagen del API**:

```
2 migrations found in prisma/migrations
Applying migration `20260727000000_initial_schema`
Applying migration `20260729020000_pt145_rating_unico_por_pedido_y_autor`
All migrations have been successfully applied.
```

## Las tres paradas del camino, y por qué justifican H-017

Las cuatro imágenes **construyeron a la primera**. Lo que costó tres vueltas fue que **arrancaran** —
que es exactamente lo que H-017 decía: *construir no es arrancar*.

### 1. ADMIN reintentando contra un nombre de compose

```
[Admin] Redis (redis://redis:6379): Connection timeout   ×22
```

Su **reserva** cuando falta `REDIS_URL` es el nombre del contenedor de `docker-compose`. Fuera de esa
red no resuelve, el proceso no termina de arrancar, y nunca llega a `healthy`.

Familia de **F-135-A**: una reserva escrita para un entorno concreto que parece un valor por defecto
razonable y no lo es. **PT-137** se ocupa del contrato de Redis.

### 2. El API negándose a arrancar, y con razón

```
STARTUP CONFIGURATION ERRORS:
  - ADMIN_API_KEY must not be a placeholder value in production
  - ADMIN_USERNAME must be set to a non-default value (not "admin")
  - ADMIN_TOTP_SECRET must be set (>=16 chars) ... must not rely on a password alone
  - ADMIN_PASSWORD must be set to a strong non-default value
  - ALLOWED_ORIGINS must be explicitly set in production
```

**No era un defecto: era el control funcionando.** `validateStartupConfig` (PT-036, PT-093) sólo
actúa con `NODE_ENV=production`, y **nadie lo había ejercido nunca dentro de una imagen** — porque
ninguna imagen se había arrancado nunca en CI. La primera vez que se le pone a prueba de verdad,
aborta y enumera los cinco motivos.

### 3. El esquema ausente

```
P2021 — The table `public.system_config` does not exist in the current database
```

La imagen de producción **no aplica migraciones al arrancar**: su `CMD` es `node dist/main`. Es la
decisión correcta —migrar es un paso de despliegue deliberado— pero significa que **arrancarla exige
una base preparada**, y quien despliegue tiene que saberlo.

## Lo que se decidió y por qué

| Decisión | Motivo |
|---|---|
| **Contextos no uniformes** | El API construye desde la raíz: `@ironloot/core` es `file:../packages/core`. Igualarlos —el arreglo natural— rompe el suyo |
| **La del API, sin caché** | Es la única en frío. En PT-135 un volumen de `node_modules` reutilizado tapó un lock roto un día entero |
| **Volcar el log antes de fallar** | **Se pagó solo tres veces.** Las tres paradas dieron su causa exacta sin reproducir nada a mano |
| **Migrar con la propia imagen** | Comprueba que puede migrar sola, que es lo que un despliegue real le pedirá. Hacerlo desde el runner probaría otra cosa |
| **Los SSR piden `/`** | Su healthcheck demuestra además que `views/` y `public/` viajaron a la imagen. Uno contra un endpoint JSON no lo haría |

## Regresión

```
Unitarias:  738 / 738   en 97 suites   (729 + 9 de la guarda RULE-26)
e2e en CI:   86 / 86
Los ocho jobs: en verde
```
