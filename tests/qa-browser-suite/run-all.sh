#!/usr/bin/env bash
# Runner de la suite QA completa desde cero (reset BD + todas las fases + retiro + historial).
# Uso: bash run-all.sh
set -u
H="$(cd "$(dirname "$0")" && pwd)"
cd "$H"
DB="ironloot-db"
ROOT="C:/DevOps/Desarrollos/IronLoot/qa-out"

log(){ echo -e "\n\033[1;36m==== $* ====\033[0m"; }

log "1) RESET BD — truncar todos los datos (empezar de cero)"
TABLES="payment_cycle_events,payment_cycles,audit_events,error_events,request_logs,withdrawal_requests,sessions,auctions,orders,bids,payments,shipments,ratings,disputes,notifications,wallets,user_payment_methods,system_config,ledger,profiles,users,commission_config,commission_records,moderation_log,cfdi_records,kyc_submissions,notification_campaigns,seo_config,cms_content,watchlist,refund_requests"
docker exec "$DB" psql -U ironloot -d ironloot_db -c "TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE;" >/dev/null 2>&1 \
  && echo "   OK truncadas" || { echo "   FALLO truncando"; exit 1; }
echo "   users=$(docker exec "$DB" psql -U ironloot -d ironloot_db -t -A -c 'SELECT count(*) FROM users')"

log "2) Reiniciar API (limpiar estado tras reset) y esperar health"
docker restart ironloot-api >/dev/null 2>&1
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null)
  [ "$code" = "200" ] && { echo "   API health 200 (intento $i)"; break; }
  sleep 2
done

log "3) Fase 00 — Smoke (crea OUT + .last-run)"
node 00-smoke.cjs || exit 1
OUT=$(cat "$ROOT/.last-run" | tr '\\' '/')   # normalizar a forward-slashes para los node -e siguientes
echo "   OUT=$OUT"

run_phase(){ log "$1"; node "$2" || echo "   (fase $2 terminó con error, continúo)"; }

run_phase "4) Fase 10 — Bootstrap del mundo (KYC-gated seller)" 10-bootstrap.cjs
run_phase "5) Fase 20 — Rutas autenticadas" 20-authed.cjs
run_phase "6) Fase 30 — E2E puja + bloqueo + outbid + liberación (incluye E2E-6)" 30-e2e.cjs
# PT-074 — 31-outbid.cjs es un re-run AISLADO de E2E-6 (requiere subasta fresca); no va en la secuencia
#          porque 30-e2e ya deja el precio en 700 (re-pujar 700 sobre 700 se rechaza, esperado).
#          Se conserva como herramienta standalone: `node 31-outbid.cjs`.
run_phase "7) Fase 40 — Extras (auth/responsive/CSP/cross-browser)" 40-extras.cjs
run_phase "8) Fase 50 — Escrituras admin" 50-admin-writes.cjs
run_phase "9) Fase 60 — RETIRO REAL DEL VENDEDOR (KYC→CLABE→holdback→solicitud→admin)" 60-withdrawal.cjs

log "10) Historial comprador + vendedor"
# Leer OUT y actores dentro de node desde .last-run (evita backslashes de Windows en el string del shell)
node -e "const fs=require('fs');const out=fs.readFileSync('C:/DevOps/Desarrollos/IronLoot/qa-out/.last-run','utf8').trim();const a=JSON.parse(fs.readFileSync(out+'/.actors.json','utf8'));fs.mkdirSync('C:/tmp',{recursive:true});fs.writeFileSync('C:/tmp/act.json',JSON.stringify({buyer:a.BUYER,seller:a.SELLER},null,2));console.log('   act.json escrito');"
node hist-check.cjs || echo "   (hist-check con error)"

log "RESUMEN FINAL"
for j in smoke bootstrap authed e2e extras admin-writes withdrawal; do
  f="$OUT/$j.json"
  [ -f "$f" ] && echo "   $j: $(node -e "const a=require('$f');const p=a.filter(x=>x.status==='PASS').length;const t=a.length;console.log(p+'/'+t+' PASS')" 2>/dev/null)"
done
echo -e "\nSalida completa: $OUT"
