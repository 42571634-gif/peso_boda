# Backend Google Sheets

Este backend usa Google Apps Script como API y Google Sheets como base de datos.

## Estructura

- `appsscript.json`: manifiesto del proyecto Apps Script.
- `Config.gs`: nombre de hoja, key y columnas.
- `Api.gs`: endpoints `doGet` y `doPost`.
- `Auth.gs`: validacion de key.
- `SheetRepository.gs`: lectura y escritura en Google Sheets.
- `Models.gs`: normalizacion de registros.
- `Response.gs`: respuestas JSON y JSONP.
- `schema.md`: estructura de la hoja.
- `api-contract.md`: contrato de sincronizacion.

## Deploy manual

1. Crea una hoja nueva en Google Sheets.
2. Abre `Extensiones > Apps Script`.
3. Copia los archivos `.gs` de esta carpeta al proyecto Apps Script.
4. En `Config.gs`, cambia `CAMBIA_ESTA_KEY_PRIVADA` por tu key privada real.
5. En configuracion del proyecto, activa el runtime V8 si no lo esta.
6. Ve a `Implementar > Nueva implementacion`.
7. Selecciona `Aplicacion web`.
8. Ejecutar como: `Yo`.
9. Quien tiene acceso: `Cualquier usuario con el enlace`.
10. Copia la URL terminada en `/exec`.
11. Pega esa URL en la app, en `Google Sheets > URL de Apps Script`.

## Deploy rapido

Si no quieres copiar varios archivos, usa el archivo unico:

```text
../apps-script-backend.gs
```

Ese archivo contiene la misma logica en una sola pieza.

## Seguridad

La key privada bloquea usos accidentales, pero no reemplaza autenticacion real de usuarios. Para un uso personal y privado con una URL no publica puede ser suficiente; para publicar ampliamente convendria mover la API a un backend con autenticacion real.
