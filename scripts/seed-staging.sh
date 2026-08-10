#!/bin/bash
# Crea usuarios de prueba en staging via Supabase Admin API
# Los inserts en auth.users no se pueden hacer directamente en prod — usar esta API
set -e

echo "=== Seed de usuarios en staging ==="
echo ""

source .env 2>/dev/null || true

: "${SUPABASE_URL:?Falta SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Falta SUPABASE_SERVICE_ROLE_KEY}"

ADMIN_API="$SUPABASE_URL/auth/v1/admin/users"

create_user() {
  local email="$1"
  local password="$2"
  local full_name="$3"
  local role="$4"

  echo -n "  Creando $role: $email ... "
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$ADMIN_API" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"full_name\": \"$full_name\",
        \"role\": \"$role\"
      }
    }")

  http_code=$(echo "$response" | tail -n1)
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "OK"
  else
    echo "ERROR ($http_code)"
  fi
}

echo "Profesores de prueba:"
create_user "profesor1@test.yleis.co" "Test1234!" "María García" "teacher"
create_user "profesor2@test.yleis.co" "Test1234!" "Carlos Rodríguez" "teacher"

echo ""
echo "Alumnos de prueba:"
create_user "alumno1@test.yleis.co" "Test1234!" "Ana Martínez" "student"
create_user "alumno2@test.yleis.co" "Test1234!" "Juan López" "student"
create_user "alumno3@test.yleis.co" "Test1234!" "Sofía Pérez" "student"

echo ""
echo "Admin:"
create_user "admin@test.yleis.co" "Admin1234!" "Admin Yleis" "student"
echo ""
echo "  Ejecutar en Supabase SQL Editor para dar rol admin:"
echo "  UPDATE public.users SET role = 'admin' WHERE email = 'admin@test.yleis.co';"

echo ""
echo "=== Seed completado ==="
echo ""
echo "Credenciales de prueba:"
echo "  Profesor 1: profesor1@test.yleis.co / Test1234!"
echo "  Alumno 1:   alumno1@test.yleis.co  / Test1234!"
