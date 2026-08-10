#!/bin/bash
# Tests de integración para todas las Edge Functions
# Requiere un usuario de prueba con JWT válido en TEST_JWT
set -e

echo "=== Tests de Edge Functions — Yleis ==="
echo ""

source .env 2>/dev/null || true

BASE_URL="${SUPABASE_URL}/functions/v1"
ANON_KEY="${SUPABASE_ANON_KEY}"
JWT="${TEST_JWT:-}"

PASS=0
FAIL=0

assert_status() {
  local desc="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $desc"
    ((PASS++))
  else
    echo "  ❌ $desc — esperado: $expected, recibido: $actual"
    ((FAIL++))
  fi
}

echo "1. verify-teacher-slot"
echo "   --- Sin auth → 401"
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/verify-teacher-slot" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"teacher_id":"test","scheduled_at":"2099-01-01T10:00:00Z","duration_min":60}')
assert_status "verify-teacher-slot sin JWT → 401" "401" "$status"

echo ""
echo "2. mp-webhook — seguridad HMAC"
echo "   --- Firma inválida → 401"
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/mp-webhook?data.id=test123" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "x-signature: ts=1234,v1=firma_invalida_abc123" \
  -H "x-request-id: test-req-id" \
  -d '{"action":"payment.created","data":{"id":"test123"}}')
assert_status "mp-webhook con HMAC inválida → 401" "401" "$status"

echo ""
echo "   --- Sin headers de firma → 401"
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/mp-webhook" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"action":"payment.created","data":{"id":"test456"}}')
assert_status "mp-webhook sin headers de firma → 401" "401" "$status"

echo ""
echo "3. create-payment-preference — sin auth"
echo "   --- Sin JWT → 401"
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/create-payment-preference" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"booking_id":"00000000-0000-0000-0000-000000000000"}')
assert_status "create-payment-preference sin JWT → 401" "401" "$status"

echo ""
echo "4. cancel-booking — sin auth"
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/cancel-booking" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"booking_id":"00000000-0000-0000-0000-000000000000"}')
assert_status "cancel-booking sin JWT → 401" "401" "$status"

echo ""
echo "5. express-go-online — sin auth"
status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/express-go-online" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"action":"online"}')
assert_status "express-go-online sin JWT → 401" "401" "$status"

echo ""
echo "=================================="
echo "Resultado: $PASS passed · $FAIL failed"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "⚠️  Hay tests fallando. Revisá los logs de las funciones en Supabase Dashboard."
  exit 1
else
  echo "✅ Todos los tests de seguridad pasaron."
fi
