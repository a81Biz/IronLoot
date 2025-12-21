## 1. Propósito

Este documento define la **convención oficial de desarrollo** para Iron Loot en cuanto a:

* desarrollo local **obligatoriamente en Docker**,
* repositorio oficial en **GitHub**,
* política de ramas (dev/qa/prep/prod + rama personal de desarrollador),
* y un pipeline **CI/CD mínimo con pruebas automatizadas**.

Este documento **no define servidores ni infraestructura** de QA/PROD; eso se establecerá más adelante.
Aquí se define **la disciplina de ingeniería** para garantizar calidad y estabilidad desde el repositorio.

---

## 2. Desarrollo local en Docker (obligatorio)

### 2.1 Regla

Todo desarrollo local de Iron Loot se ejecuta mediante **Docker**.

Nadie debe depender de:

* instalaciones locales de Node,
* instalaciones locales de PostgreSQL,
* configuraciones manuales por máquina.

### 2.2 Objetivos

* reproducibilidad total del entorno,
* onboarding rápido de nuevos devs,
* reducir “works on my machine”.

### 2.3 Alcance mínimo del entorno Docker

El entorno local debe incluir al menos:

* API (NestJS)
* DB (PostgreSQL)
* Redis (si se usa en el MVP)
* (Opcional) herramienta de administración DB

### 2.4 Configuración estándar

* `docker-compose.yml` en raíz del repo
* `.env.example` documentado
* volúmenes persistentes controlados para DB
* puertos publicados solo lo necesario

---

## 3. Repositorio oficial (GitHub)

### 3.1 Reglas de repositorio

* Un repositorio principal “source of truth”.
* Issues y PRs se gestionan en GitHub.
* Todo cambio al código entra por PR (no commits directos a ramas protegidas).

### 3.2 Convención de commits

Se recomienda un estilo consistente (ej. Conventional Commits), por ejemplo:

* `feat: ...`
* `fix: ...`
* `chore: ...`
* `docs: ...`
* `test: ...`

Esto facilita:

* release notes,
* trazabilidad,
* automatización de versionado (si se implementa después).

---

## 4. Modelo de ramas (branching model)

### 4.1 Objetivo del modelo

Separar con claridad:

* trabajo individual (ramas personales),
* integración (dev),
* validación QA (qa),
* preparación release (prep),
* y versión candidata/estabilizada (prod).

### 4.2 Ramas oficiales

#### `prod`

* Rama estable.
* Solo recibe merges desde `prep`.
* Representa “lo que sería producción”.
* Protegida: PR obligatorio, checks obligatorios.

#### `prep`

* Rama de preparación de release.
* Se usa para:

  * congelamiento,
  * fixes finales,
  * validación completa.
* Solo recibe merges desde `qa` (y fixes controlados).

#### `qa`

* Rama de pruebas integradas.
* Aquí se valida:

  * funcionalidad end-to-end (dentro de lo posible),
  * smoke tests,
  * integración de módulos.
* Recibe merges desde `dev`.

#### `dev`

* Rama de integración continua.
* Aquí se integran features terminadas.
* Debe estar siempre “usable”, aunque no necesariamente lista para release.

#### `dev/<nombre-desarrollador>`

* Rama personal de cada desarrollador.
* Ejemplos:

  * `dev/alberto`
  * `dev/ana`
  * `dev/juan`

**Regla:** Todo desarrollo inicia en una rama personal o feature branch y termina en PR.

---

## 5. Flujo de trabajo (promoción de ramas)

### 5.1 Flujo estándar

1. Dev trabaja en `dev/<nombre>` o `feature/<id>-<desc>`
2. PR hacia `dev` (integración)
3. PR de `dev` → `qa` (cuando hay un conjunto listo para validar)
4. PR de `qa` → `prep` (cuando QA valida y se congela)
5. PR de `prep` → `prod` (release final)

### 5.2 Reglas para promover a `qa` / `prep` / `prod`

* No se promueve código con tests fallando.
* Todo PR debe pasar checks obligatorios.
* `prep` y `prod` son ramas protegidas con revisión.

---

## 6. CI/CD (mínimo obligatorio)

> Nota: Aunque no existan servidores aún, el CI/CD ya debe existir para garantizar calidad.

### 6.1 CI obligatorio en cada PR

En cada Pull Request hacia `dev`, `qa`, `prep` o `prod` se ejecuta:

1. **Lint**
2. **Typecheck** (TypeScript)
3. **Unit Tests**
4. **Build**
5. (Opcional recomendado) **Tests de integración** con Docker (DB)

Si cualquier paso falla, el PR no puede mergearse.

### 6.2 CI en merges a ramas oficiales

En merge a:

* `dev`: pipeline completo (rápido)
* `qa`: pipeline completo + tests de integración
* `prep`: pipeline completo + versión candidata (tag opcional)
* `prod`: pipeline completo + release (tag obligatorio recomendado)

---

## 7. Pruebas automatizadas (estrategia mínima)

### 7.1 Tipos de pruebas

* **Unit tests**: servicios y reglas de negocio
* **Integration tests**: repositorios y DB
* **Smoke tests**: endpoints principales (MVP)

### 7.2 Regla

No se acepta funcionalidad nueva sin:

* al menos unit tests de la regla central,
* y smoke test si afecta un endpoint clave (pujas/pagos/cierre).

---

## 8. CD (despliegue) – diferido

### 8.1 Estado actual

Aún no se definen:

* servidores,
* infraestructura,
* proveedores,
* entornos de despliegue.

Por lo tanto:

* **no existe despliegue automático** por ahora.

### 8.2 Qué sí se prepara desde hoy

Aunque no haya servidores, el repo debe estar listo para CD mediante:

* build reproducible por Dockerfile
* versionado mediante tags
* artefactos listos (imagen Docker) al hacer merge a `prod`

Esto permite que el día que se defina infraestructura, el despliegue sea un paso natural.

---

## 9. Políticas de protección de ramas

### 9.1 `prod` y `prep`

* PR obligatorio
* al menos 1–2 revisores
* CI obligatorio (no se puede mergear sin verde)
* sin force-push

### 9.2 `qa` y `dev`

* PR obligatorio recomendado
* CI obligatorio
* revisores según tamaño del equipo

---

## 10. Artefactos y versionado

### 10.1 Versionado recomendado

* Tags semánticos (`v0.1.0`, `v0.2.0`, etc.)
* Solo se taggea desde `prod`

### 10.2 Artefacto objetivo (cuando se habilite)

* Imagen Docker versionada por tag
* Release notes automáticas (opcional futuro)

---

## 11. Estructura mínima esperada del repositorio

En raíz:

* `docker-compose.yml`
* `Dockerfile` (o Dockerfile.dev / Dockerfile.prod si se decide)
* `.env.example`
* `README.md` (setup y comandos)
* `docs/` (todos los documentos)

---

## 12. Resultado esperado

Con esta convención:

* cualquier dev clona el repo y levanta todo con Docker,
* cualquier PR se valida automáticamente,
* las ramas representan estados claros del producto,
* QA y releases pueden trabajar sin improvisación,
* y cuando exista infraestructura, el CD se conecta sin reestructurar el proyecto.
