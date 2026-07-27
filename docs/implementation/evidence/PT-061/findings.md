# PT-061 — Investigación OBS-01: hallazgos

| Aspecto | Documentado | Implementado |
|---|---|---|
| Envío KYC vendedor (`POST /api/v1/kyc`) | Sí (04-App-Flow §8) | **No** (módulo KYC sin controller) |
| Gate KYC antes de vender | Implícito (01-Platform-Overview) | **No** (enable-seller no exige KYC) |
| Revisión admin KYC | Sí | Sí (pero sin submissions que revisar) |

**Conclusión**: gap diseño↔implementación. Decisión de producto pendiente (implementar gate A / actualizar docs B).
