#!/bin/bash
# Deploy a PRODUCCIÓN — requiere confirmación explícita
# NUNCA correr sin haber pasado el Bloque 11 (Testing) completo
set -e

echo "⚠️  ATENCIÓN: Estás a punto de hacer deploy a PRODUCCIÓN"
echo ""
echo "Checklist de pre-deploy (respondé SI/NO a cada uno):"
echo ""
echo "[ ] ¿RLS verificado en todas las tablas?"
echo "[ ] ¿Edge Functions probadas en staging?"
echo "[ ] ¿Workflows de n8n verificados en staging?"
echo "[ ] ¿MP_ACCESS_TOKEN de PRODUCCIÓN configurado (no sandbox)?"
echo "[ ] ¿Cuenta bancaria conectada en Mercado Pago?"
echo "[ ] ¿Pago de prueba real de verificación completado?"
echo ""

read -p "¿Confirmás que todos los items están completados? (escribí PRODUCCION para confirmar): " confirm

if [ "$confirm" != "PRODUCCION" ]; then
  echo "Deploy cancelado."
  exit 1
fi

echo ""
echo "=== Iniciando deploy a PRODUCCIÓN ==="
echo ""

if [ ! -f .env ]; then
  echo "ERROR: .env no encontrado."
  exit 1
fi

source .env
: "${SUPABASE_URL:?Falta SUPABASE_URL}"

echo "1. Linkeando a proyecto de PRODUCCIÓN..."
read -p "Ingresá el project-ref de PRODUCCIÓN: " PROD_REF
supabase link --project-ref "$PROD_REF"
echo "   ✅ Linkeado a producción"

echo ""
echo "2. Aplicando migraciones en PRODUCCIÓN..."
supabase db push
echo "   ✅ Migraciones aplicadas"

echo ""
echo "3. Configurando secrets de producción..."
echo "   (verificar que todos los secrets de producción están configurados en Supabase Dashboard)"
supabase secrets list

echo ""
echo "4. Desplegando Edge Functions a PRODUCCIÓN..."
supabase functions deploy --all
echo "   ✅ Edge Functions desplegadas"

echo ""
echo "=== Deploy a PRODUCCIÓN completado ==="
echo ""
echo "⚠️  Recordatorios finales:"
echo "   - Verificar que MP_ACCESS_TOKEN es el de PRODUCCIÓN (no sandbox)"
echo "   - Hacer un pago de \$1 COP de prueba"
echo "   - Activar workflows de n8n en producción"
echo "   - Configurar DNS: yleis.co → FlutterFlow"
echo "   - Activar UptimeRobot"
