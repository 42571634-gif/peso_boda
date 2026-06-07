# Contrato API

Backend: Google Apps Script publicado como aplicacion web.

## Autenticacion simple

Toda sincronizacion debe enviar:

```json
{
  "key": "TU_KEY_PRIVADA"
}
```

## Sincronizar con JSONP

La app web usa JSONP para evitar CORS:

```text
GET /exec?action=sync&callback=nombreCallback&payload={...}
```

Payload:

```json
{
  "action": "sync",
  "key": "TU_KEY_PRIVADA",
  "clientTime": "2026-06-07T13:00:00.000Z",
  "records": [
    {
      "id": "uuid",
      "person": "Alberto",
      "date": "2026-06-07",
      "weight": 78.4,
      "note": "Opcional",
      "status": "active",
      "createdAt": "2026-06-07T13:00:00.000Z",
      "updatedAt": "2026-06-07T13:00:00.000Z",
      "deletedAt": ""
    }
  ]
}
```

Respuesta:

```json
{
  "ok": true,
  "records": [],
  "serverTime": "2026-06-07T13:00:01.000Z"
}
```

## Sincronizar con POST

Tambien existe `POST /exec` con el mismo payload JSON. Puede servir para pruebas o una app futura con backend propio.

## Resolucion de conflictos

El backend compara `updatedAt`. Si el registro entrante es mas reciente o igual al de la hoja, lo reemplaza. Si es mas antiguo, conserva la version existente.
