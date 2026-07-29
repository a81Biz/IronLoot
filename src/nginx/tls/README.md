# TLS local — PT-158

**Esto no está activo por defecto, y es deliberado.**

## El hueco que cierra

La suite QA por navegador corre sobre `http://`. Consecuencia: **todo lo que dependa de origen seguro
no queda ejercido** — cookies `Secure`, y las APIs que el navegador reserva a contextos seguros. La
suite pasa, y lo que no probó no aparece por ninguna parte.

Registrado en `PTSA/PENDIENTES.md` desde S-002-V.

## Lo que este PT entrega, y lo que no

**Entrega:** el guion que genera el certificado con los SAN correctos (los cuatro subdominios), la
configuración de nginx en `nginx-tls.conf`, y las instrucciones de confianza para los tres sistemas.

**No entrega:** el cambio activado. Dos razones, las dos honestas:

1. **Confiar un certificado es una acción sobre la máquina**, no sobre el repositorio, y exige
   privilegios de administrador. Un guion que toque el almacén de certificados de quien lo ejecute
   sería una sorpresa desagradable.
2. **No he podido verificarlo de punta a punta.** `run-all.sh` **trunca la base de datos**, y la
   base actual sostiene mediciones de la auditoría S-003. Ejecutarlo para probar TLS habría
   destruido evidencia por comprobar una configuración.

Dejar activado algo que no he visto funcionar sería peor que dejarlo declarado. Es la misma razón por
la que PT-161 se revirtió: **entregar algo que aparenta funcionar es peor que entregar menos.**

## Cómo activarlo

```bash
bash src/nginx/tls/generar-certificado.sh     # genera el par, e imprime el paso manual
# … confiar el certificado (el guion dice cómo en cada SO) …
docker compose --profile tls up -d nginx
QA_BASE_URL=https://ironloot.local bash tests/qa-browser-suite/run-all.sh
```

## Nota sobre `ignoreHTTPSErrors`

**No se usa.** Saltarse la validación daría una sensación falsa de cobertura: el transporte sería
HTTPS pero nadie estaría comprobando que el certificado sirve. Si hay que confiar el certificado,
que se confíe — y si no se confía, que la suite falle diciéndolo.

## Riesgo residual

Ni el certificado ni `nginx-tls.conf` los ha ejercido nadie todavía. **La primera persona que active
esto puede encontrar que falta algo**, y eso está dicho aquí en vez de descubrirse en silencio.
