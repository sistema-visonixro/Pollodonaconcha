# Configuración de Variables de Entorno en Vercel

## 🔐 Configurar Supabase en Vercel

Para proteger tus credenciales de Supabase, debes configurarlas directamente en Vercel:

### Paso 1: Acceder a la configuración de Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Añadir variables de entorno

Añade las siguientes variables:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `VITE_SUPABASE_URL` | `https://qxrdbsgktnyhigduhzcw.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

**Importante:** 
- Marca todas las casillas: **Production**, **Preview** y **Development**
- Usa la clave pública (anon key) de Supabase, NO la service_role key

### Paso 3: Re-deploy

Después de añadir las variables:
1. Ve a **Deployments**
2. Haz clic en los tres puntos del último deployment
3. Selecciona **Redeploy**

### Paso 4: Verificar

Las variables estarán disponibles automáticamente en tu aplicación como:
```typescript
import.meta.env.VITE_SUPABASE_URL
import.meta.env.VITE_SUPABASE_KEY
```

## 🔒 Seguridad

### Row Level Security (RLS) en Supabase

**IMPORTANTE:** La clave pública (anon key) es segura para el frontend SOLO si tienes configurado Row Level Security en Supabase:

1. Ve a tu proyecto en Supabase
2. Authentication → Policies
3. Habilita RLS en todas las tablas sensibles
4. Crea políticas para controlar acceso por usuario/rol

Ejemplo de política:
```sql
-- Permitir a los usuarios ver solo sus propios datos
CREATE POLICY "Users can view own data"
ON public.usuarios
FOR SELECT
USING (auth.uid() = id);
```

## 📝 Desarrollo Local

Para desarrollo local:

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Rellena con tus credenciales reales (NO las subas a git)

3. El archivo `.env` está en `.gitignore` y no se subirá al repositorio

## ✅ Checklist de Seguridad

- [ ] Variables configuradas en Vercel
- [ ] Archivo `.env` en `.gitignore`
- [ ] RLS habilitado en Supabase
- [ ] Políticas de acceso configuradas
- [ ] Solo usar anon key (nunca service_role en frontend)
- [ ] Redeploy realizado en Vercel

## 🔗 Enlaces Útiles

- [Documentación de Variables de Entorno en Vercel](https://vercel.com/docs/projects/environment-variables)
- [Row Level Security en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
