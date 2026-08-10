#!/bin/bash
# Audit de seguridad del proyecto Yleis
# Corre antes de todo commit a main y antes del deploy a producción
set -e

echo "=== Audit de seguridad — Yleis ==="
echo ""

PASS=0
FAIL=0

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  ✅ $desc"
    ((PASS++))
  else
    echo "  ❌ $desc — $result"
    ((FAIL++))
  fi
}

echo "1. Verificando secretos hardcodeados en código fuente..."
secrets_found=$(grep -r -i \
  --include="*.ts" --include="*.dart" --include="*.js" --include="*.json" \
  -E "(service_role|APP_USR-[a-zA-Z0-9]+|re_[a-zA-Z0-9]+|eyJhbGciOiJIUzI1)" \
  supabase/functions/ flutterflow/ n8n/ 2>/dev/null | grep -v ".example" | grep -v "_test" || true)

if [ -z "$secrets_found" ]; then
  check "Sin secretos hardcodeados en código" "ok"
else
  check "Sin secretos hardcodeados en código" "ENCONTRADO: $secrets_found"
fi

echo ""
echo "2. Verificando que .env no está en staging..."
if git ls-files --error-unmatch .env 2>/dev/null; then
  check ".env NO en Git" "ERROR: .env está siendo trackeado por Git"
else
  check ".env NO en Git" "ok"
fi

echo ""
echo "3. Verificando CORS en Edge Functions..."
cors_wildcard=$(grep -r '"Access-Control-Allow-Origin": "\*"' supabase/functions/ 2>/dev/null || true)
if [ -z "$cors_wildcard" ]; then
  check "CORS no usa wildcard" "ok"
else
  check "CORS no usa wildcard" "ADVERTENCIA: wildcard encontrado en CORS — verificar que es intencional solo en desarrollo"
fi

echo ""
echo "4. Verificando validación HMAC en mp-webhook..."
if grep -q "validateMPSignature" supabase/functions/mp-webhook/index.ts 2>/dev/null; then
  check "Validación HMAC presente en mp-webhook" "ok"
else
  check "Validación HMAC presente en mp-webhook" "FALTA: validateMPSignature no encontrada"
fi

echo ""
echo "5. Verificando que el precio nunca viene del body del cliente..."
price_from_body=$(grep -r "body\.price\|body\[.price.\]\|req\.price" supabase/functions/ 2>/dev/null || true)
if [ -z "$price_from_body" ]; then
  check "Precio calculado en servidor, no viene del cliente" "ok"
else
  check "Precio calculado en servidor, no viene del cliente" "RIESGO: precio del cliente detectado"
fi

echo ""
echo "6. Verificando filtro de ownership en Edge Functions..."
if grep -q "eq.*student_id.*user.id\|eq.*teacher_id.*user.id" supabase/functions/create-payment-preference/index.ts 2>/dev/null; then
  check "Ownership verificado en create-payment-preference" "ok"
else
  check "Ownership verificado en create-payment-preference" "REVISAR: verificar ownership check"
fi

echo ""
echo "7. Verificando idempotencia en mp-webhook..."
if grep -q "mp_webhook_logs" supabase/functions/mp-webhook/index.ts 2>/dev/null; then
  check "Idempotencia implementada en mp-webhook" "ok"
else
  check "Idempotencia implementada en mp-webhook" "FALTA: mp_webhook_logs no encontrado"
fi

echo ""
echo "8. Verificando service_role key ausente de FlutterFlow custom actions..."
service_in_ff=$(grep -r "service_role" flutterflow/ 2>/dev/null || true)
if [ -z "$service_in_ff" ]; then
  check "service_role key ausente de FlutterFlow" "ok"
else
  check "service_role key ausente de FlutterFlow" "CRÍTICO: service_role encontrado en código cliente"
fi

echo ""
echo "=================================="
echo "Resultado: $PASS passed · $FAIL failed"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "⚠️  Corregí los items fallidos antes de continuar."
  exit 1
else
  echo "✅ Audit completado sin problemas."
fi
