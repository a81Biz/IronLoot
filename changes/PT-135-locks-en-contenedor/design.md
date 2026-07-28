# PT-135 — Diseño

**Tipo**: BUG · **Complejidad**: MAJOR · **Origen**: reporte humano, «el contenedor de api no levanta»
**Plan**: `docs/implementation/PLAN_ACTUAL.md` (revisión 2, ACK completo 2026-07-28)

---

## El defecto, en una línea

`src/api/package-lock.json` se generó en Windows (PT-126) y perdió las entradas de plataforma de
Linux; `npm install` dentro del contenedor sólo instala lo que el lock declara, así que el proceso
muere al hacer `require` del binario nativo de `@css-inline`, y con el API `unhealthy` los otros
cuatro contenedores no arrancan nunca.

## Las dos invariantes que gobiernan el diseño

| | Invariante | Estado hoy |
|---|---|---|
| **I1** | **npm no se ejecuta en el host. Se ejecuta en el contenedor** | Declarada, **sin mecanismo**. Ya se violó una vez y el síntoma tardó un día en aparecer, en otra máquina |
| **I2** | Los locks son el contrato de reproducibilidad y viven en git | En desacuerdo con `.gitignore:40` desde meses, sin decisión registrada |

Todo lo demás se deriva de esas dos. **I1 sin mecanismo es la causa raíz**; el lock roto es su primera
consecuencia visible.

---

## Decisiones

### D1 — Cómo se regenera el lock: dentro del contenedor, y con qué invocación

```
docker compose run --rm --no-deps --entrypoint sh api -c "npm install --package-lock-only"
```

`--entrypoint sh` **no es opcional**: el servicio declara `ENTRYPOINT ["./scripts/entrypoint.dev.sh"]`
y sin sustituirlo el comando llegaría como argumento del entrypoint, que espera a la base y arranca
Nest. `--no-deps` evita levantar db y redis para generar un fichero.

**Punto a medir antes de aceptarlo (tarea .2)**: si `--package-lock-only` sobre Linux escribe el
árbol **completo** de `optionalDependencies` (las 17 entradas, como el lock previo a PT-126) o sólo
las de su plataforma. Si sólo escribe las suyas, estaríamos repitiendo PT-126 con los signos
cambiados, y hay que resolverlo antes de seguir. **No se da por supuesto: se mide y se registra.**

### D2 — Qué plataformas debe declarar el lock: las dos que construimos

El plan pedía «que conserve también las de win32, por simetría». **Con I1 en vigor esa exigencia
se cae**, y conviene decirlo porque es una consecuencia real del ACK: si nadie puede instalar en
Windows, el lock no necesita el binario de Windows.

La exigencia queda en **las dos plataformas que este repositorio construye de verdad**:

| Plataforma | Quién la usa |
|---|---|
| `linux-x64-gnu` | `Dockerfile.dev` — `node:20-slim`, Debian bookworm, glibc 2.36 (medido) |
| `linux-x64-musl` | `Dockerfile` — `node:20-alpine`, musl |

Si la regeneración conserva además win32 y darwin, se acepta y no molesta. Si no las conserva, **es
coherente con I1** y no se fuerza. La guarda (D4) comprueba las dos de arriba y nada más.

### D3 — Los locks se siguen por git; `.gitignore:40` se retira

Alternativa C, resuelta. Razones en el plan; la corta: **el lock no es el defecto, lo es dónde se
generó**. Dejar de seguirlo renunciaría a la reproducibilidad y rompería el caché de los siete jobs
(`cache: 'npm'` sin `cache-dependency-path` resuelve el lock de la raíz).

La contradicción se elimina en vez de declararse como excepción: una regla que dice lo contrario de
lo que el repositorio hace es una trampa para el siguiente que la lea y la respete.

`src/admin/package-lock.json` —hoy en disco y fuera de git— se regenera en su contenedor y se empieza
a seguir. Era la mitad del inventario que faltaba: **su árbol no es reproducible por nadie más.**

### D4 — Dos guardas, porque son dos fallos distintos

| Guarda | Qué impide | Dónde |
|---|---|---|
| **G1 — contenido del lock** | Que un lock sin los binarios de Linux llegue a `master` | Prueba unitaria en `src/api/test/unit/` |
| **G2 — `preinstall`** | Que se ejecute npm fuera del contenedor | `package.json` de raíz, `src/api` y `src/admin` |

**G2 es la corrección real del PT.** G1 caza el síntoma en CI; G2 impide producirlo. Sin G2 esto
vuelve: la primera vez fue PT-129 (musl), la segunda hoy (gnu), y no hay motivo para que no haya
tercera.

**Cómo detecta G2 que no está en el contenedor**: `process.platform !== 'linux'` → abortar con el
comando correcto en el mensaje. Es la señal más simple que cubre el caso real (host Windows/macOS).
CI es `ubuntu-latest`, luego Linux, luego pasa — deliberado: CI **debe** poder instalar.

**Sin puerta de escape por variable de entorno.** Una invariante con `--force` es una costumbre otra
vez, y este PT existe porque una costumbre no bastó.

Refinamiento a medir, no a suponer (tarea .4): si conviene además exigir `/.dockerenv`. Endurece la
guarda pero podría bloquear CI. **Se mide; si bloquea, se queda en la comprobación de plataforma.**

### D5 — Hacer el lock autoritativo: `npm ci`

Mientras CI y las imágenes usen `npm install`, el lock es una sugerencia: cada build vuelve a
resolver y el fichero no gobierna nada. Con los tres locks correctos, pasan a `npm ci`.

**Matiz honesto**: `npm ci` **no** habría evitado este defecto — instala exactamente el lock, y el
lock estaba mal. Lo que aporta es que el fichero pase a mandar de verdad. Quien lea esto no debe
concluir que `npm ci` es la protección: la protección es G1 + G2.

### D6 — El parche de `Dockerfile:62` se conserva

`npm install --no-save @css-inline/css-inline-linux-x64-musl` queda, con **el comentario corregido**:
hoy afirma que «la variante existe en `package-lock.json`», y PT-126 la había borrado el día antes.
El parche funciona; su explicación acusa al culpable equivocado, y quien la lea concluirá que el lock
está sano.

Se conserva porque es un cinturón sobre una causa que **ya reincidió dos veces**. Retirarlo se
justificará cuando G1 y G2 lleven tiempo y se les haya visto fallar — no antes: sería cambiar un
control por una promesa.

### D7 — El orden, y por qué

```
G1 en RED  ->  lock regenerado  ->  arranque verificado  ->  G2  ->  scripts  ->
admin+gitignore  ->  npm ci imagenes  ->  npm ci CI  ->  documentacion  ->  regresion
   [1]              [2]                  [3]                [4]     [5]
                    ^                                        ^                    ^
       aqui el entorno vuelve a estar vivo         aqui deja de repetirse    al final:
                                                                          un control que
                                                                          nace rojo muere
```

`npm ci` va **al final** por PT-118: un control que pone CI rojo el primer día se desactiva. Y si
destapa desajustes lock↔`package.json`, **se corrigen dentro de este PT** (no hay deuda diferida
disponible); si uno excediera el PT, ese punto concreto vuelve a `npm install` **y se dice**.

---

## Riesgos que el diseño asume

| # | Riesgo | Cómo lo absorbe el diseño |
|---|---|---|
| **A** | `--package-lock-only` no produce el árbol completo | D1 lo mide **antes** de aceptar el mecanismo |
| **B** | G2 bloquea algo legítimo (husky, un job, una herramienta) | `src/api` tiene `prepare: cd ../.. && husky install` (`package.json:25`): se comprueba que las dos etapas conviven. Y los siete jobs, uno a uno |
| **C** | Verificar sobre el volumen viejo y concluir en falso | La evidencia **declara** volumen eliminado y `--no-cache`. Es cómo PT-127 estuvo a punto de cerrarse afirmando algo falso |
| **D** | Reconstruir destapa bloqueos apilados, como PT-129 | Sólo se ha ejercido **el primer `require` que falla**. Lo que aparezca se corrige aquí |
| **E** | Regenerar mueve versiones además de plataformas | Diff entrada por entrada; 919 unitarias + 77 e2e + `npm audit` como red |
| **F** | Los tres SSR pasan a construir **con** lock por primera vez | Cambia lo que instalan: los cuatro se arrancan y se ven `healthy`, como exigió la aceptación de PT-129 |
