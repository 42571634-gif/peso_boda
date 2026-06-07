# Esquema de Google Sheets

La hoja debe llamarse `Registros`. Si no existe, el backend la crea automaticamente.

| Columna | Tipo | Descripcion |
| --- | --- | --- |
| `id` | texto | UUID generado por la app. |
| `person` | texto | `Alberto` o `Carla`. |
| `date` | fecha ISO | Fecha del peso, formato `YYYY-MM-DD`. |
| `weight` | numero | Peso en kg con un decimal. |
| `note` | texto | Nota opcional. |
| `status` | texto | `active` o `annulled`. |
| `createdAt` | datetime ISO | Fecha de creacion del registro. |
| `updatedAt` | datetime ISO | Ultima modificacion. |
| `deletedAt` | datetime ISO | Fecha de anulacion; vacio si esta activo. |

Los registros anulados no se borran. Se conservan con `status = annulled` para mantener trazabilidad y permitir que todos los dispositivos sincronicen el mismo estado.
