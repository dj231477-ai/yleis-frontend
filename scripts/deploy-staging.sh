#!/bin/bash
# Deploy completo a staging — seguro de correr en cualquier momento
set -e

echo "=== Deploy a STAGING ==="
echo ""

# Verificar que el .env existe
if [ ! -f .env ]; then
  echo "ERROR: .env no encontrado. Copiá .env.example y completá las variables."
  exit 1
fi

source .env

# Verificar variables críticas
: "${SUPABASE_URL:?Falta SUPABASE_URL en .env}"

echo "1. Aplicando migraciones en staging..."
supabase db push
echo "   ✅ Migraciones aplicadas"

echo ""
echo "2. Desplegando Edge Functions..."
supabase functions deploy --all
echo "   ✅ Edge Functions desplegadas"

echo ""
echo "3. Verificando funciones activas..."
supabase functions list
echo ""

echo "=== Deploy a staging completado ==="
echo ""
echo "Próximos pasos:"
echo "  - Correr scripts/test-all-webhooks.sh para verificar que todo funciona"
echo "  - Importar workflows de n8n: bash n8n/scripts/import-all.sh"
