-- Agregar columna 'estado' a la tabla cierres
-- Esta columna indica si el registro es una APERTURA o un CIERRE
-- Al registrar apertura: estado = 'APERTURA'
-- Al registrar cierre: estado = 'CIERRE'

ALTER TABLE cierres
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'APERTURA';

-- Actualizar registros existentes según el tipo_registro
UPDATE cierres
SET estado = CASE
  WHEN tipo_registro = 'apertura' THEN 'APERTURA'
  WHEN tipo_registro = 'cierre' THEN 'CIERRE'
  ELSE 'APERTURA'
END;
