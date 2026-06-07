# Registro de peso con Google Sheets

App web privada para Alberto y Carla: registra peso por fecha, muestra evolucion en graficos, permite anular registros y sincroniza automaticamente con Google Sheets.

## Archivos

- `index.html`: app principal.
- `styles.css`: estilos.
- `app.js`: estado local, grafico, historial y sincronizacion.
- `apps-script-backend.gs`: backend para pegar en Google Apps Script.
- `backend/`: estructura modular del backend para Apps Script.
- `assets/`: ilustraciones SVG locales para la interfaz.

## Acceso

La app solicita tu key privada y el backend tambien la valida durante la sincronizacion.

Despues del primer ingreso correcto, la app guarda la key en el navegador con `localStorage`, por lo que no vuelve a pedirla en futuras visitas desde el mismo dispositivo. El boton de candado en la parte superior borra ese acceso guardado.

## Configurar Google Sheets como backend

1. Crea una hoja nueva en Google Sheets.
2. Ve a `Extensiones > Apps Script`.
3. Pega el contenido de `apps-script-backend.gs`, o copia la estructura modular de `backend/`.
4. Cambia `CAMBIA_ESTA_KEY_PRIVADA` por tu key privada real en Apps Script.
5. Guarda el proyecto.
6. Ve a `Implementar > Nueva implementacion`.
7. Tipo: `Aplicacion web`.
8. Ejecutar como: `Yo`.
9. Quien tiene acceso: `Cualquier usuario con el enlace`.
10. Copia la URL terminada en `/exec`.
11. Abre `index.html`, pega esa URL en `URL de Apps Script` y pulsa `Guardar conexion`.

La app sincroniza automaticamente al ingresar, al crear un registro y al anularlo. Si no hay conexion, guarda los cambios localmente y los envia en la proxima sincronizacion.

La sincronizacion usa JSONP para evitar bloqueos CORS de Apps Script cuando abres la app como archivo local, desde un servidor simple o desde GitHub Pages.

La documentacion tecnica del backend esta en `backend/README.md`, `backend/schema.md` y `backend/api-contract.md`.
