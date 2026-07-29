#!/usr/bin/env bash
# PT-158 — Certificado local para ejercer la suite QA sobre TLS.
#
# ## Por qué hace falta
#
# La suite corre sobre `http://`, así que **todo lo que dependa de origen seguro no queda ejercido**:
# cookies `Secure`, y las APIs que el navegador reserva a contextos seguros. La suite pasa, y lo que
# no probó no aparece por ninguna parte — que es la forma más silenciosa de no tener cobertura.
#
# ## Lo que este guion NO puede hacer
#
# **Confiar el certificado en el almacén del sistema operativo.** Eso es una acción sobre la máquina,
# no sobre el repositorio, y exige privilegios de administrador. Se documenta abajo y se deja al
# humano a propósito: un guion que toque el almacén de certificados de quien lo ejecute sería una
# sorpresa desagradable.
#
# Uso:  bash src/nginx/tls/generar-certificado.sh
set -euo pipefail

DESTINO="$(dirname "$0")"
DOMINIO="${PUBLIC_DOMAIN:-ironloot.local}"

if [ -f "$DESTINO/ironloot.local.crt" ]; then
  echo "[tls] Ya existe $DESTINO/ironloot.local.crt — no se sobrescribe."
  echo "[tls] Bórralo a mano si quieres regenerarlo."
  exit 0
fi

# SAN con los cuatro subdominios: sin ellos el navegador rechaza el certificado aunque esté confiado.
cat > "$DESTINO/openssl.cnf" <<CNF
[req]
distinguished_name = dn
x509_extensions    = ext
prompt             = no
[dn]
CN = ${DOMINIO}
[ext]
subjectAltName = DNS:${DOMINIO}, DNS:base.${DOMINIO}, DNS:client.${DOMINIO}, DNS:admin.${DOMINIO}, DNS:api.${DOMINIO}, DNS:localhost
basicConstraints = critical, CA:TRUE
keyUsage = critical, digitalSignature, keyCertSign
CNF

openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout "$DESTINO/ironloot.local.key" \
  -out    "$DESTINO/ironloot.local.crt" \
  -config "$DESTINO/openssl.cnf"

rm -f "$DESTINO/openssl.cnf"
chmod 600 "$DESTINO/ironloot.local.key"

cat <<FIN

[tls] Generados:
        $DESTINO/ironloot.local.crt
        $DESTINO/ironloot.local.key

[tls] PASO MANUAL — confiar el certificado. No lo hace este guion a proposito.

      Windows:  certutil -addstore -f "ROOT" src\nginx\tls\ironloot.local.crt   (como administrador)
      macOS:    sudo security add-trusted-cert -d -r trustRoot \
                  -k /Library/Keychains/System.keychain $DESTINO/ironloot.local.crt
      Linux:    sudo cp $DESTINO/ironloot.local.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates

[tls] Despues:  docker compose --profile tls up -d nginx-tls
                QA_BASE_URL=https://ironloot.local bash tests/qa-browser-suite/run-all.sh

FIN
