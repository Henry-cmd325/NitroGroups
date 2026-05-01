# Requisito: migrar almacenamiento de medios de grupo de Supabase a Cloudflare R2

**Feature (camelCase):** `groupMedia` (misma feature; solo cambia el proveedor de objetos).  
**Versión:** 1.0

---

## 1. Objetivo

Sustituir **Supabase Storage** por **Cloudflare R2** para la subida de binarios del endpoint existente **`POST /api/groups/{groupId}/media/upload`**. El contrato HTTP hacia el front **no cambia**: multipart campo `file`, respuesta JSON `{ url, mediaType }`, mismos códigos de error de negocio (400/401/403/503) donde aplique.

---

## 2. Restricciones técnicas (obligatorias)

- R2 es **compatible S3**: usar **AWS SDK for .NET** (o equivalente oficial) con **endpoint** estilo `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, región **`auto`**, credenciales **Access Key / Secret** de R2 (no API tokens de Cloudflare dashboard genéricos salvo que sean las de S3 API).
- **Configuración solo en el API .NET** (`appsettings` / `appsettings.Development.json`), sección sugerida **`R2`** (o nombre coherente con el repo): `AccountId`, `AccessKeyId`, `SecretAccessKey`, `Bucket`, y **`PublicBaseUrl`** (URL pública del bucket o dominio custom) **o** política explícita de URLs firmadas si el producto no usa bucket público.
- **Eliminar** dependencias y código específicos de Supabase en el backend (`SupabaseGroupMediaStorage`, `SupabaseStorageOptions`, `PostConfigure` de env `SUPABASE_*` si ya no aplica). Mantener **una abstracción** clara (p. ej. `IGroupMediaObjectStorage` / `R2GroupMediaStorage`) inyectada en el endpoint de subida.
- **No** mover la subida de vuelta al front: el upload sigue en **NitroGroups.Services.Api**.
- **Front**: si solo consume `url` devuelta por el API, no debe acoplarse a Supabase; quitar variables `SUPABASE_*` del UI **solo** si ya no se usan para nada más (scripts de verificación, etc.).
- Añadir **`r2.storage.example.json`** (o análogo) junto al API con placeholders, igual que el patrón `supabase.storage.example.json`.

---

## 3. Comportamiento esperado

- Clave de objeto en bucket: prefijo por grupo, p. ej. `groups/{groupId}/{uuid}.{ext}` (igual o equivalente al actual).
- Tipos MIME / `mediaType` (`photo` | `video` | `audio`): misma lógica que hoy.
- Errores de proveedor: mensaje útil en JSON; log en servidor sin volcar secretos.

---

## 4. Fuera de alcance (salvo que el contrato lo exija)

- CDN Workers, transformaciones de imagen, ni lifecycle policies avanzadas en R2.
- Cambiar el contrato B2B de listado de medios salvo que sea estrictamente necesario para alinear nombres de campos.
