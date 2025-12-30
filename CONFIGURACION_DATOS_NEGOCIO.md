# Configuración de Datos del Negocio

## 📋 Resumen de la Funcionalidad

La aplicación ahora tiene un sistema completo de **"Datos del Negocio"** que permite personalizar:

- ✅ **Logo de la empresa** (usado en: favicon, fondo, facturas, reportes)
- ✅ **Nombre del negocio** (usado en: título de la página, facturas, reportes)
- ✅ **RTN** (número de identificación fiscal)
- ✅ **Dirección** (dirección física del negocio)
- ✅ **Teléfono/Celular** (número de contacto)
- ✅ **Propietario** (nombre del dueño/gerente)

---

## 🗄️ Base de Datos: Tabla `datos_negocio`

### Estructura de la Tabla

Ejecuta este SQL en Supabase para crear la tabla:

```sql
-- Crear tabla datos_negocio
CREATE TABLE IF NOT EXISTS datos_negocio (
  id SERIAL PRIMARY KEY,
  nombre_negocio TEXT NOT NULL DEFAULT 'Mi Negocio',
  rtn TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  celular TEXT NOT NULL DEFAULT '',
  propietario TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar registro inicial (opcional)
INSERT INTO datos_negocio (nombre_negocio, rtn, direccion, celular, propietario, logo_url)
VALUES ('Pollos Doña Concha', '18071993019392', 'ISLAS DE LA BAHÍA, SANDY BAY, BO. LA UVA', '32841306', 'CESAR BENIGNO VEGA CANELAS', NULL);

-- Habilitar RLS (Row Level Security)
ALTER TABLE datos_negocio ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública
CREATE POLICY "Lectura pública de datos negocio"
  ON datos_negocio
  FOR SELECT
  TO public
  USING (true);

-- Política para actualización (solo usuarios autenticados)
CREATE POLICY "Actualización solo autenticados"
  ON datos_negocio
  FOR UPDATE
  TO authenticated
  USING (true);
```

---

## 🪣 Storage: Bucket `logos-negocio`

### Crear el Bucket

1. Ve a **Supabase Dashboard** → **Storage**
2. Crea un nuevo bucket llamado: `logos-negocio`
3. Configura el bucket como **público**

### Configurar Políticas de Storage

Ejecuta estos comandos SQL:

```sql
-- Política de lectura pública para logos
CREATE POLICY "Lectura pública de logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'logos-negocio');

-- Política de subida para usuarios autenticados
CREATE POLICY "Subir logos solo autenticados"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos-negocio');

-- Política de actualización para usuarios autenticados
CREATE POLICY "Actualizar logos solo autenticados"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos-negocio');

-- Política de eliminación para usuarios autenticados
CREATE POLICY "Eliminar logos solo autenticados"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos-negocio');
```

---

## 🎨 ¿Dónde se Usa el Logo?

El logo subido en **"Datos del Negocio"** se utiliza en:

1. **Favicon de la página** (icono en la pestaña del navegador)
2. **Fondo de la pantalla de Apertura de Caja**
3. **Encabezado de facturas impresas** (Recibos de venta)
4. **Reportes de cierre de caja**
5. **Panel de administración** (decoración visual)

---

## 📄 ¿Dónde se Usa el Nombre del Negocio?

El nombre configurado se muestra en:

1. **Título de la página** (`<title>` del navegador)
2. **Encabezado de facturas**
3. **Reportes de cierre**
4. **Todos los documentos oficiales**

---

## 📍 ¿Dónde se Usan los Datos Adicionales?

### RTN (Registro Tributario Nacional)
- Facturas impresas
- Reportes oficiales

### Dirección
- Facturas impresas
- Documentos legales

### Teléfono
- Facturas impresas
- Información de contacto

### Propietario
- Facturas impresas
- Documentos oficiales

---

## 🔧 Uso en la Aplicación

### 1. Acceder a "Mis Datos"

1. Inicia sesión en la aplicación
2. Ve al **Panel de Administración**
3. Haz clic en la tarjeta **"Mis Datos"**

### 2. Editar Información

- Completa todos los campos requeridos (marcados con *)
- Sube un logo (PNG, JPG, WebP - máx. 2MB)
- Haz clic en **"Guardar Cambios"**

### 3. Aplicación de Cambios

- **El título de la página** se actualizará automáticamente
- **El favicon** se cambiará al logo nuevo
- **El fondo de pantalla** usará el logo
- **Las facturas** mostrarán los datos actualizados

**Nota:** Después de guardar, la página se recargará automáticamente para aplicar todos los cambios.

---

## 🛠️ Implementación Técnica

### Hook: `useDatosNegocio()`

El sistema usa un hook personalizado que:
- Carga los datos al iniciar la app
- Actualiza el título y favicon dinámicamente
- Cachea los datos para rendimiento óptimo
- Se invalida cuando se actualizan los datos

### Archivos Modificados

- ✅ `src/useDatosNegocio.ts` - Hook personalizado
- ✅ `src/DatosNegocioView.tsx` - Vista de configuración
- ✅ `src/PuntoDeVentaView.tsx` - Facturas dinámicas
- ✅ `src/RegistroCierreView.tsx` - Reportes de cierre
- ✅ `src/FondoImagen.tsx` - Fondo con logo
- ✅ `src/App.tsx` - Integración global

---

## ✅ Checklist de Configuración

- [ ] Crear tabla `datos_negocio` en Supabase
- [ ] Insertar registro inicial (opcional)
- [ ] Configurar políticas RLS en la tabla
- [ ] Crear bucket `logos-negocio` en Storage
- [ ] Configurar políticas de Storage
- [ ] Acceder a "Mis Datos" desde el Admin Panel
- [ ] Subir logo de la empresa
- [ ] Completar información del negocio
- [ ] Verificar que el título cambió
- [ ] Verificar que el favicon cambió
- [ ] Imprimir una factura de prueba

---

## 🐛 Solución de Problemas

### El logo no se muestra
- Verifica que el bucket `logos-negocio` sea público
- Revisa las políticas de Storage
- Comprueba que la URL del logo sea válida

### El título no cambia
- Recarga la página (Ctrl+F5 o Cmd+Shift+R)
- Verifica que los datos estén guardados en la tabla
- Revisa la consola del navegador por errores

### Las facturas no muestran los datos
- Confirma que el registro exista en `datos_negocio`
- Verifica que todos los campos estén completos
- Prueba imprimir una nueva venta

---

## 📞 Soporte

Si encuentras problemas, verifica:
1. La conexión a Supabase
2. Las políticas de seguridad (RLS)
3. Los permisos del bucket de Storage
4. La consola del navegador para errores

---

**¡La aplicación ahora está completamente personalizable con los datos de tu negocio!** 🎉
