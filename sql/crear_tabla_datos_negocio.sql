-- Crear tabla datos_negocio en Supabase
-- Esta tabla almacenará la información del negocio

CREATE TABLE IF NOT EXISTS public.datos_negocio (
    id SERIAL PRIMARY KEY,
    nombre_negocio VARCHAR(255) NOT NULL,
    rtn VARCHAR(50) NOT NULL,
    direccion TEXT NOT NULL,
    celular VARCHAR(50) NOT NULL,
    propietario VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Agregar comentarios a las columnas para documentación
COMMENT ON TABLE public.datos_negocio IS 'Información general del negocio';
COMMENT ON COLUMN public.datos_negocio.id IS 'Identificador único';
COMMENT ON COLUMN public.datos_negocio.nombre_negocio IS 'Nombre comercial del negocio';
COMMENT ON COLUMN public.datos_negocio.rtn IS 'Registro Tributario Nacional';
COMMENT ON COLUMN public.datos_negocio.direccion IS 'Dirección física del negocio';
COMMENT ON COLUMN public.datos_negocio.celular IS 'Número de teléfono celular';
COMMENT ON COLUMN public.datos_negocio.propietario IS 'Nombre del propietario';
COMMENT ON COLUMN public.datos_negocio.logo_url IS 'URL del logo almacenado en Supabase Storage';

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.datos_negocio ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Permitir lectura a usuarios autenticados"
ON public.datos_negocio
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir inserción solo a usuarios autenticados
CREATE POLICY "Permitir inserción a usuarios autenticados"
ON public.datos_negocio
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para permitir actualización solo a usuarios autenticados
CREATE POLICY "Permitir actualización a usuarios autenticados"
ON public.datos_negocio
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Crear función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER trigger_actualizar_updated_at
    BEFORE UPDATE ON public.datos_negocio
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_updated_at();

-- Insertar registro inicial (opcional - puedes modificar los valores)
INSERT INTO public.datos_negocio (nombre_negocio, rtn, direccion, celular, propietario, logo_url)
VALUES ('Mi Negocio', '0000-0000-000000', 'Dirección del negocio', '0000-0000', 'Nombre del propietario', NULL)
ON CONFLICT DO NOTHING;
