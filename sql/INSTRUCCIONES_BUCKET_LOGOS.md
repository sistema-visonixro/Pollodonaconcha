# Configuración del Bucket para el Logo del Negocio en Supabase

## Pasos para crear el bucket en Supabase Storage

### 1. Acceder a Storage en Supabase Dashboard
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral izquierdo, haz clic en **Storage**

### 2. Crear el Bucket
1. Haz clic en el botón **"New bucket"** (Nuevo bucket)
2. Configura el bucket con los siguientes datos:
   - **Name (Nombre):** `logos-negocio`
   - **Public bucket:** ✅ **Activar** (marcar como público)
   - **File size limit:** 2 MB (opcional, para limitar el tamaño de las imágenes)
   - **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/gif, image/webp` (opcional)

3. Haz clic en **"Create bucket"** (Crear bucket)

### 3. Configurar Políticas de Acceso (Policies)

Si el bucket es público, no necesitas políticas adicionales. Pero si quieres más control, puedes configurar políticas personalizadas:

#### Opción A: Bucket Público (Recomendado para logos)
Si marcaste el bucket como público en el paso 2, las imágenes serán accesibles públicamente. **Ya está configurado.**

#### Opción B: Configuración Manual de Políticas (Opcional)
Si prefieres controlar el acceso manualmente:

1. En el bucket `logos-negocio`, haz clic en los tres puntos (**...**) y selecciona **"Policies"**
2. Agrega las siguientes políticas:

**Política 1: Permitir lectura pública**
```sql
-- Nombre: Permitir lectura pública de logos
-- Operation: SELECT
-- Policy definition:
CREATE POLICY "Permitir lectura pública de logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos-negocio');
```

**Política 2: Permitir subida a usuarios autenticados**
```sql
-- Nombre: Permitir subida de logos a usuarios autenticados
-- Operation: INSERT
-- Policy definition:
CREATE POLICY "Permitir subida de logos a usuarios autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos-negocio');
```

**Política 3: Permitir actualización a usuarios autenticados**
```sql
-- Nombre: Permitir actualización de logos a usuarios autenticados
-- Operation: UPDATE
-- Policy definition:
CREATE POLICY "Permitir actualización de logos a usuarios autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos-negocio');
```

**Política 4: Permitir eliminación a usuarios autenticados**
```sql
-- Nombre: Permitir eliminación de logos a usuarios autenticados
-- Operation: DELETE
-- Policy definition:
CREATE POLICY "Permitir eliminación de logos a usuarios autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos-negocio');
```

### 4. Verificar la Configuración

Para verificar que el bucket está configurado correctamente:

1. Sube una imagen de prueba desde el dashboard
2. Copia la URL pública de la imagen
3. Abre la URL en tu navegador para verificar que es accesible

La URL pública tendrá el formato:
```
https://[tu-proyecto].supabase.co/storage/v1/object/public/logos-negocio/[nombre-archivo]
```

### 5. Variables de Entorno

Asegúrate de que tu archivo `.env` o las variables de entorno en Vercel tengan configuradas las siguientes variables:

```env
VITE_SUPABASE_URL=https://[tu-proyecto].supabase.co
VITE_SUPABASE_KEY=[tu-anon-key]
```

### 6. Formatos de Imagen Recomendados

Para el logo del negocio, se recomiendan los siguientes formatos:
- **PNG** (recomendado para logos con transparencia)
- **JPG/JPEG** (buena compresión para fotos)
- **WebP** (mejor compresión, soporte moderno)
- **SVG** (ideal para logos vectoriales, peso mínimo)

**Tamaño recomendado:** 500x500px (máximo 2MB)

### 7. Notas Importantes

- ✅ El bucket debe llamarse exactamente `logos-negocio` (el código lo referencia con este nombre)
- ✅ Si es público, cualquiera puede ver las imágenes (apropiado para logos)
- ✅ Las imágenes antiguas se eliminan automáticamente al subir una nueva
- ✅ La aplicación genera nombres únicos usando timestamp para evitar conflictos

### 8. Troubleshooting (Solución de Problemas)

**Problema:** Error al subir imagen
- Verifica que el bucket existe y se llama `logos-negocio`
- Verifica que el usuario está autenticado
- Verifica las políticas de seguridad (RLS)

**Problema:** Imagen no se ve en la aplicación
- Verifica que el bucket sea público O que las políticas permitan lectura
- Verifica que la URL en la base de datos sea correcta
- Abre la URL directamente en el navegador para verificar acceso

**Problema:** No se puede eliminar imagen antigua
- Verifica la política de DELETE para usuarios autenticados
- Verifica que el nombre del archivo sea correcto

---

## Resumen Rápido

```bash
1. Storage → New bucket → Nombre: "logos-negocio" → Public: ✅ → Create
2. Ejecutar SQL en Editor SQL: sql/crear_tabla_datos_negocio.sql
3. ✅ Listo para usar
```
