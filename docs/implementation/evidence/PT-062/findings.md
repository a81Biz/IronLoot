# PT-062 — Re-verificación broadcast (PT-051/BUG-QA-12): VALIDADO

| Vía | Resultado |
|---|---|
| API `POST /admin/notifications/campaigns` | 201, status=SENT, recipientsCount=3, 3 notifs creadas |
| UI admin `/notifications` (segment ALL) | 302 → /notifications?sent=1, campaña SENT, recipients=3 |
| Enum status | SENT (válido); QUEUED inexistente en CampaignStatus |

**Conclusión**: broadcast funciona end-to-end; PT-051 validado. Sin bug. CLOSED.
Screenshots: compose.png, ui_after_send.png.
