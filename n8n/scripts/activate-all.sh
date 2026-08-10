#!/bin/bash
# Activa todos los workflows importados en n8n
# Uso: N8N_URL=https://n8n.yleis.co N8N_API_KEY=xxx bash n8n/scripts/activate-all.sh

set -e

N8N_URL="${N8N_URL:?Variable N8N_URL no configurada}"
N8N_API_KEY="${N8N_API_KEY:?Variable N8N_API_KEY no configurada}"

echo "=== Obteniendo lista de workflows ==="

response=$(curl -s "$N8N_URL/api/v1/workflows?limit=50" \
  -H "X-N8N-API-KEY: $N8N_API_KEY")

# Extraer IDs (requiere jq instalado)
if command -v jq &> /dev/null; then
  ids=$(echo "$response" | jq -r '.data[].id')
else
  echo "Error: jq no está instalado. Instalalo con: brew install jq"
  exit 1
fi

echo "=== Activando workflows ==="

for id in $ids; do
  echo -n "  Activando workflow $id ... "
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$N8N_URL/api/v1/workflows/$id/activate" \
    -H "X-N8N-API-KEY: $N8N_API_KEY")

  if [ "$http_code" -eq 200 ]; then
    echo "OK"
  else
    echo "ERROR ($http_code)"
  fi
done

echo ""
echo "=== Verificando estado ==="
curl -s "$N8N_URL/api/v1/workflows?limit=50" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq -r '.data[] | "\(.name): \(if .active then "✅ active" else "❌ inactive" end)"'
