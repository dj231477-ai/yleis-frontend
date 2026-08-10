# Yleis

Plataforma educativa híbrida — SaaS + Marketplace.
Conecta estudiantes con profesores para clases de idiomas, tutorías y traducciones.

## Stack

| Capa | Herramienta |
|------|-------------|
| Frontend | FlutterFlow Pro |
| Base de datos | Supabase / PostgreSQL |
| Funciones backend | Supabase Edge Functions (Deno) |
| Automatización | n8n |
| Pagos | Mercado Pago Checkout Pro |
| Emails | Resend |
| Videollamadas | Google Meet (link manual, MVP) |

## Setup inicial

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Completar .env con credenciales reales

# 2. Login a Supabase CLI
supabase login

# 3. Linkear al proyecto staging
supabase link --project-ref [REF_STAGING]

# 4. Aplicar migraciones
supabase db push

# 5. Deploy Edge Functions
supabase functions deploy --all
```

## Estructura

```
supabase/migrations/   — 15 migraciones SQL en orden
supabase/functions/    — 5 Edge Functions + módulo _shared
n8n/workflows/         — 9 workflows JSON importables via API
emails/                — 11 templates HTML responsive
flutterflow/           — Custom Actions Dart para FlutterFlow
scripts/               — deploy, testing y seguridad
```

## Comandos frecuentes

```bash
# Aplicar migraciones en staging
supabase db push

# Deploy función individual
supabase functions deploy verify-teacher-slot

# Deploy todas las funciones
supabase functions deploy --all

# Ver logs en tiempo real
supabase logs --project-ref [REF]

# Importar workflow a n8n
bash n8n/scripts/import-all.sh
```

Leer `CLAUDE.md` antes de cualquier modificación al proyecto.
