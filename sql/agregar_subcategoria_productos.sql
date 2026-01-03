-- Script para agregar columna subcategoria a la tabla productos
-- Ejecutar en Supabase SQL Editor

-- Agregar columna subcategoria (opcional, solo para productos tipo comida)
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS subcategoria TEXT;

-- Agregar comentario a la columna
COMMENT ON COLUMN productos.subcategoria IS 'Subcategoría para productos de tipo comida: ROSTIZADOS, FRITOS, TACOS, ASADOS, etc.';

-- Crear índice para mejorar búsquedas por subcategoría
CREATE INDEX IF NOT EXISTS idx_productos_subcategoria ON productos(subcategoria) WHERE subcategoria IS NOT NULL;

-- Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'productos' AND column_name = 'subcategoria';
