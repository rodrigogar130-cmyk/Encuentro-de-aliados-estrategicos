# Sesión de Aliados Estratégicos 2026 · UAEMéx / DDE

Micrositio corporativo para **confirmación de asistencia de empresarios y aliados**. Diseño responsive en negro, dorado y marfil inspirado en el flyer facilitado por la organización.

## Alcance

- Página pública `GET /` con información del evento y un formulario para confirmar que se asistirá o no.
- Formulario: nombre, apellidos, empresa/organización, cargo, sector, correo, teléfono opcional, comentarios y autorización sobre datos personales.
- Validación, protección contra formularios automáticos básicos, detección de duplicados por correo.
- Folio único de confirmación y comprobante imprimible al guardar la respuesta.
- Registro **en Excel XLSX** dentro del servidor. **No usa Supabase ni otra base de datos**.
- Panel administrativo privado `GET /admin` con métricas y descarga protegida del Excel.

## Cómo ponerlo en marcha

1. Instalar Node.js 20 o superior en un servidor o equipo con acceso a internet.
2. Copiar este proyecto a una carpeta y ejecutar `npm install`.
3. Copiar `.env.example` a `.env` y asignar una contraseña robusta y distinta a `ADMIN_PASSWORD`.
4. Ejecutar `npm start`.
5. Abrir `http://localhost:3000` para visitar el formulario. El organizador entra a `http://localhost:3000/admin` con **usuario** `organizador` y la contraseña definida.
6. Abrir el enlace público de la aplicación una vez publicado en un dominio con **HTTPS**.

## El Excel

- Plantilla vacía: `template/Registros_Aliados_Estrategicos_2026.xlsx`.
- Archivo que guarda las respuestas del servidor: `DATA_DIR/Registros_Aliados_Estrategicos_2026.xlsx`.
- Hoja **Registros**: folio, marca temporal, datos personales/empresariales y asistencia.
- Hoja **Resumen**: fórmulas para asistentes confirmados, negativos y total de respuestas.
- Hoja **Instrucciones**: controles operativos.

El backend crea el archivo de datos a partir de la plantilla en el primer arranque y actualiza el mismo archivo mediante escrituras atómicas serializadas. Cada correo puede registrarse **solo una vez**. Las modificaciones de una respuesta existente debe gestionarlas el organizador directamente desde el Excel, mientras no haya escrituras concurrentes.

**No publicar la carpeta `data/`, no subirla a GitHub y no compartir el XLSX fuera del personal autorizado.**

## Despliegue y liga pública

**No usar GitHub Pages solo.** Es un hosting estático y no puede escribir el Excel compartido de los asistentes. Para funcionar se necesita un hosting de Node.js con acceso a **almacenamiento persistente** (por ejemplo un VPS o un servicio compatible con volúmenes), dominio y HTTPS.

Configuración sugerida en un hosting Node:
- Comando de instalación: `npm ci` (después de generar `package-lock.json` con `npm install`)
- Comando de ejecución: `npm start`
- Puerto: `PORT` que asigne el proveedor
- Variables: `ADMIN_PASSWORD` y `DATA_DIR=/ruta/de/volumen/persistente`
- Ejecutar **una sola instancia** de Node para evitar escritura concurrente entre múltiples procesos.
- No ubicar `DATA_DIR` dentro de la carpeta `public/`.

La liga real que se enviará junto con el flyer solo existirá cuando el servicio esté publicado. **No hay dominio ni URL pública creada en esta entrega.**

## Privacidad y seguridad: pendiente antes de publicar

La página `aviso-privacidad.html` incluye un **borrador no aprobado**, marcado expresamente para sustitución por el aviso institucional aplicable. La Dirección debe validar el texto legal, responsable, contacto y mecanismo de ejercicio de derechos antes de recopilar datos reales. No se solicita CURP ni otros identificadores innecesarios.

El panel utiliza autenticación básica HTTP: se requiere **HTTPS obligatorio** para no exponer las credenciales. Usar contraseñas largas, backups diarios del XLSX, controles de acceso al archivo y actualización de dependencias. La limitación de solicitudes es básica/en memoria; para un sitio público de alto tráfico, añadir WAF / CAPTCHA / rate limiting en el proxy.

## Datos del evento

- **Nombre:** Sesión de Aliados Estratégicos.
- **Organiza:** Dirección de Desarrollo Empresarial, UAEMéx.
- **Fecha:** jueves 10 de diciembre de 2026.
- **Recepción:** 17:00 h (México centro).
- **Ubicación:** Edificio UAEMitas, piso 5, calle Leona Vicario 201 esq. Primero de Mayo, col. Santa Clara, Toluca, Estado de México, C.P. 50090.

## Pruebas recomendadas

1. Registrar respuesta de prueba “Sí, asistiré” y comprobar folio AE26-0001.
2. Ir a `/admin`, comprobar +1 confirmación y descargar XLSX.
3. Registrar “No podré asistir” con **otro correo**, comprobar +1 al total y a no asistentes.
4. Intentar registrar correo duplicado y confirmar rechazo sin crear segunda fila.
5. Confirmar uso desde móvil y que la dirección de la sede sea visible.
6. Revisar el aviso de privacidad autorizado y realizar una copia de seguridad antes de enviar el enlace a invitados.

**Nota de la entrega:** El HTML/CSS/JS, servidor y Excel han sido preparados; la verificación integral de API y escritura no pudo ejecutarse en este entorno porque la descarga de dependencias de npm no se completó. Ejecutar las pruebas antes del despliegue productivo.
