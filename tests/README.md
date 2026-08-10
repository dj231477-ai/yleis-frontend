# Tests — Yleis

## E2E (Playwright)

Corre contra `main.yleis.co` por defecto (o `PLAYWRIGHT_BASE_URL` si lo seteás).

```bash
npm run test:e2e       # headless
npm run test:e2e:ui    # modo interactivo
```

Tests en `tests/e2e/`:

| Archivo | Qué cubre |
|---|---|
| `auth.setup.ts` | Loguea las 2 cuentas de prueba una vez, guarda sesión en `.auth/*.json` |
| `login.spec.ts` | Login, registro, credenciales inválidas, redirect de Google OAuth, guard de `/app` |
| `dashboards.spec.ts` | Dashboard de profesor y de estudiante cargan autenticados |
| `onboarding.spec.ts` | Formulario de onboarding de 3 pasos, verifica que persiste en DB |
| `booking.spec.ts` | Reservar clase programada → redirect a Mercado Pago |
| `plans.spec.ts` | Activar un plan de membresía → redirect a Mercado Pago |
| `express.spec.ts` | Crear solicitud Express → estado "buscando" con timer |

Hay 2 cuentas de prueba reales en el proyecto (`cuentaprofesor@prueba.com` /
`cuentaestudiante@prueba.com`, password `123456789`). Para usar otras
credenciales, seteá `TEST_TEACHER_EMAIL` / `TEST_TEACHER_PASSWORD` /
`TEST_STUDENT_EMAIL` / `TEST_STUDENT_PASSWORD`.

**Importante — la suite corre en serie (`workers: 1`), a propósito.** Varios
tests mutan filas compartidas de las mismas 2 cuentas en Supabase
(`onboarding_step` del profesor, bookings pendientes del estudiante) vía
`beforeEach` — cada test resetea el estado que necesita antes de correr, pero
en paralelo dos archivos pueden pisarse la misma fila al mismo tiempo. Si se
agregan más tests, mantené el patrón: cualquier test que dependa de un estado
específico de una cuenta compartida lo fuerza en su propio `beforeEach` en vez
de asumir que quedó así del test anterior.

## API / Edge Functions (Postman + Newman)

Chequea que las Edge Functions rechacen requests sin autenticación válida (401).

Primera vez: copiá `tests/postman/environment.example.json` a
`tests/postman/environment.local.json` (gitignored) y completá `SUPABASE_URL` /
`SUPABASE_ANON_KEY` con los valores del proyecto — ya viene generado con los
del proyecto actual (`ekpnisnaekbhgnhleuea`).

```bash
npm run test:api
```

Colección en `tests/postman/yleis-edge-functions.postman_collection.json` —
también se puede abrir directo en Postman.
