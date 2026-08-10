#!/bin/bash
# Importa todos los workflows de Yleis a n8n via API
# Uso: N8N_URL=https://n8n.yleis.co N8N_API_KEY=xxx bash n8n/scripts/import-all.sh

set -e

N8N_URL="${N8N_URL:?Variable N8N_URL no configurada}"
N8N_API_KEY="${N8N_API_KEY:?Variable N8N_API_KEY no configurada}"
WORKFLOWS_DIR="$(dirname "$0")/../workflows"

echo "=== Importando workflows a $N8N_URL ==="

for file in "$WORKFLOWS_DIR"/W*.json; do
  name=$(basename "$file")
  echo -n "  Importando $name ... "

  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$N8N_URL/api/v1/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$file")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    id=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "OK (id: $id)"
  else
    echo "ERROR ($http_code): $body"
    exit 1
  fi
done

echo ""
echo "=== Todos los workflows importados ==="
echo "Ahora ejecutá: bash n8n/scripts/activate-all.sh"
