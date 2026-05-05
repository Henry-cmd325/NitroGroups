# Requisito: galería / medios del grupo (subida y visualización)

**Feature sugerida (camelCase):** `groupMedia`  
**Dominio de negocio:** un grupo publica o guarda recursos (imágenes, documentos) visibles o descargables en su espacio.  
**Versión del documento:** 1.0

---

## 1. Resumen ejecutivo

Los **miembros con permisos** del grupo deben poder **subir archivos** a una galería (o repositorio de medios) asociada al **grupo**, y **ver** o enlazar el contenido subido. La experiencia debe ser fiable, con trazas de error claras (tamaño, tipo, red).

---

## 2. Restricciones técnicas (obligatorias; no renegociar en taller sin producto)

- El **almacenamiento de binarios** es **Supabase Storage** (bucket configurable, p. ej. vía `SUPABASE_STORAGE_BUCKET` en el front).
- El cliente usa **Next.js**: la subida pasa por una **ruta de API** del propio `UI` (p. ej. bajo `app/api/.../media/upload` o equivalente) que aplica el cliente admin de Supabase; **no** se expone el `service_role` al navegador.
- **No** se introduce un módulo **Core** .NET (entidad, repositorio, UseCase) **solo** para almacenar o streamear bytes de ficheros. Si hace falta un contrato B2B, se limita a **metadatos** opcionales (p. ej. listado de URLs, orden, título) y **nunca** a transporte del cuerpo del fichero a través del patrón B2B de dominio clásico.
- Variables de entorno en el **UI** (nombres orientativos): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (opcional si hay default de producto). Verificación local: `npm run verify:supabase` (desde el repo) cuando aplica.

> Estas líneas alinean el taller con un contrato mínimo o vacío de Core; el upload **permanece** en el stack descrito, salvo decisión explícita de añadir solo metadatos en API .NET.

---

## 3. Actores y permisos (alto nivel)

| Actor | Necesidad |
|--------|-----------|
| Miembro / admin del grupo | Subir, ver, y si aplica eliminar o reemplazar medios (según producto v1). |
| Resto (si aplica) | Solo lectura o sin acceso; alinear con `groupId` y sesión. |

- La API debe **validar** que el `groupId` (o id de contexto) corresponde a un grupo al que el usuario autenticado **pertenece o puede administrar** (criterio ya usado en el resto de la app).

---

## 4. Alcance funcional (v1)

- **Subir** un fichero hacia un prefijo/namespace lógico por **grupo** (evitar mezclar claves con otros grupos en Storage).
- **Listar o mostrar** en UI los medios accesibles (mínimo: URLs o links seguros) para ese grupo.
- (Opcional v1) **Límite de tamaño** y **tipos permitidos** documentados; errores en español o neutros según convención del producto.

---

## 5. Fuera de alcance (salvo documento aparte)

- Procesado de imágenes en servidor (thumbnails, watermark) no exigido aquí.
- Motor de aprobación de contenido, moderación o CDN propia.
- Duplicar el binario en base de datos .NET o en repositorio de archivos en Core.

---

## 6. Criterios de aceptación (técnicos, verificables)

- Con `SUPABASE_*` correcto y bucket existente, `verify:supabase` pasa; la subida desde la UI (o ruta de prueba equivalente) **completa** y el fichero queda bajo clave/namespace del grupo.
- Un usuario no autorizado al grupo **no** puede subir a otro `groupId` (comprobación con sesión o API intermedia, según implementación).
- No se añade un flujo B2B que obligue a colgar el cuerpo del fichero en handlers .NET de dominio.

---

*Documento listo para: `npm run ai -- requirement-workshop groupMedia --file=groupMedia.md` (el `--` es obligatorio con npm para que `--file` llegue al orquestador). Luego **revisar** `ai/contracts/b2b/groupMedia.contract.json` y truncar/ajustar si el LLM propone operaciones ajenas a metadatos. `generate-feature` solo si el contrato final describe operaciones reales; para solo UI + Supabase ya implementado, puede omitirse o usarse `npm run ai -- generate-feature groupMedia --mode=frontend-only` según haga falta refinamiento.*
